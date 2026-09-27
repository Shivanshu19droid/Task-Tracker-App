import request from "supertest";
import app from "../src/app";

describe("Task API", () => {
  const userA = { name: "User A", email: "usera@example.com", password: "password123" };
  const userB = { name: "User B", email: "userb@example.com", password: "password123" };

  const createTaskBody = {
    title: "Test task",
    description: "Something to do",
    status: "pending",
  };

  // Helper: sign up + log in a user, return an agent that carries their cookie
  const authenticatedAgent = async (user: typeof userA) => {
    const agent = request.agent(app);
    await agent.post("/api/auth/signup").send(user);
    return agent;
  };

  describe("Authentication requirement", () => {
    it("should reject unauthenticated requests to all task routes (401)", async () => {
      const getRes = await request(app).get("/api/tasks");
      const postRes = await request(app).post("/api/tasks").send(createTaskBody);

      expect(getRes.status).toBe(401);
      expect(postRes.status).toBe(401);
    });
  });

  describe("POST /api/tasks", () => {
    it("should create a task owned by the logged-in user", async () => {
      const agent = await authenticatedAgent(userA);
      const res = await agent.post("/api/tasks").send(createTaskBody);

      expect(res.status).toBe(201);
      expect(res.body.task.title).toBe(createTaskBody.title);
      expect(res.body.task.owner).toBeDefined();
    });

    it("should reject a task with no title (400)", async () => {
      const agent = await authenticatedAgent(userA);
      const res = await agent.post("/api/tasks").send({ description: "No title" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/tasks", () => {
    it("should return only the logged-in user's tasks", async () => {
      const agentA = await authenticatedAgent(userA);
      const agentB = await authenticatedAgent(userB);

      await agentA.post("/api/tasks").send({ title: "A's task" });
      await agentB.post("/api/tasks").send({ title: "B's task" });

      const res = await agentA.get("/api/tasks");

      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(1);
      expect(res.body.tasks[0].title).toBe("A's task");
    });

    it("should serve the second identical request from cache", async () => {
      const agent = await authenticatedAgent(userA);
      await agent.post("/api/tasks").send(createTaskBody);

      const first = await agent.get("/api/tasks");
      const second = await agent.get("/api/tasks");

      expect(first.body.source).toBe("db");
      expect(second.body.source).toBe("cache");
    });

    it("should bypass cache and return db results when filtering by status", async () => {
      const agent = await authenticatedAgent(userA);
      await agent.post("/api/tasks").send({ title: "Pending task", status: "pending" });
      await agent.post("/api/tasks").send({ title: "Done task", status: "completed" });

      const res = await agent.get("/api/tasks?status=completed");

      expect(res.status).toBe(200);
      expect(res.body.source).toBe("db");
      expect(res.body.tasks).toHaveLength(1);
      expect(res.body.tasks[0].status).toBe("completed");
    });

    it("should reject an invalid status filter (400)", async () => {
      const agent = await authenticatedAgent(userA);
      const res = await agent.get("/api/tasks?status=archived");

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/tasks/:id", () => {
    it("should update a task the user owns", async () => {
      const agent = await authenticatedAgent(userA);
      const created = await agent.post("/api/tasks").send(createTaskBody);
      const taskId = created.body.task._id;

      const res = await agent.put(`/api/tasks/${taskId}`).send({ status: "completed" });

      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe("completed");
    });

    it("should invalidate the cache after an update", async () => {
      const agent = await authenticatedAgent(userA);
      const created = await agent.post("/api/tasks").send(createTaskBody);
      const taskId = created.body.task._id;

      await agent.get("/api/tasks"); // populates cache, source: db
      await agent.get("/api/tasks"); // served from cache
      await agent.put(`/api/tasks/${taskId}`).send({ status: "completed" });

      const afterUpdate = await agent.get("/api/tasks");
      expect(afterUpdate.body.source).toBe("db"); // cache was invalidated
    });

    it("should reject updating another user's task (403)", async () => {
      const agentA = await authenticatedAgent(userA);
      const agentB = await authenticatedAgent(userB);

      const created = await agentA.post("/api/tasks").send(createTaskBody);
      const taskId = created.body.task._id;

      const res = await agentB.put(`/api/tasks/${taskId}`).send({ status: "completed" });
      expect(res.status).toBe(403);
    });

    it("should return 404 for a non-existent task", async () => {
      const agent = await authenticatedAgent(userA);
      const fakeId = "507f1f77bcf86cd799439011";

      const res = await agent.put(`/api/tasks/${fakeId}`).send({ status: "completed" });
      expect(res.status).toBe(404);
    });

    it("should reject an empty update body (400)", async () => {
      const agent = await authenticatedAgent(userA);
      const created = await agent.post("/api/tasks").send(createTaskBody);
      const taskId = created.body.task._id;

      const res = await agent.put(`/api/tasks/${taskId}`).send({});
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should delete a task the user owns", async () => {
      const agent = await authenticatedAgent(userA);
      const created = await agent.post("/api/tasks").send(createTaskBody);
      const taskId = created.body.task._id;

      const res = await agent.delete(`/api/tasks/${taskId}`);
      expect(res.status).toBe(200);

      const afterDelete = await agent.get("/api/tasks");
      expect(afterDelete.body.tasks).toHaveLength(0);
    });

    it("should reject deleting another user's task (403)", async () => {
      const agentA = await authenticatedAgent(userA);
      const agentB = await authenticatedAgent(userB);

      const created = await agentA.post("/api/tasks").send(createTaskBody);
      const taskId = created.body.task._id;

      const res = await agentB.delete(`/api/tasks/${taskId}`);
      expect(res.status).toBe(403);
    });
  });
});