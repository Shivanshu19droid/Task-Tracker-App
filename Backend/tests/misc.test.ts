import request from "supertest";
import app from "../src/app";

describe("Miscellaneous / edge cases", () => {
  const user = { name: "Misc User", email: "misc@example.com", password: "password123" };

  const authenticatedAgent = async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/signup").send(user);
    return agent;
  };

  describe("404 handling", () => {
    it("should return a JSON 404 for an undefined route", async () => {
      const res = await request(app).get("/api/this-route-does-not-exist");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("not found");
    });
  });

  describe("Invalid ObjectId handling (Mongoose CastError)", () => {
    it("should return 400 when updating a task with a malformed ID", async () => {
      const agent = await authenticatedAgent();

      const res = await agent
        .put("/api/tasks/not-a-valid-objectid")
        .send({ status: "completed" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when deleting a task with a malformed ID", async () => {
      const agent = await authenticatedAgent();

      const res = await agent.delete("/api/tasks/not-a-valid-objectid");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Health check", () => {
    it("should return OK from /api/health", async () => {
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});