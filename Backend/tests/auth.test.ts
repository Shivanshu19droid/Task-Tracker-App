import request from "supertest";
import app from "../src/app";
import { User } from "../src/models/user.model";

describe("Auth API", () => {
  const validUser = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  };

  describe("POST /api/auth/signup", () => {
    it("should create a new user and return 201", async () => {
      const res = await request(app).post("/api/auth/signup").send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user.password).toBeUndefined(); // password must never be returned
      expect(res.headers["set-cookie"]).toBeDefined(); // JWT cookie issued
    });

    it("should hash the password before storing it", async () => {
      await request(app).post("/api/auth/signup").send(validUser);

      const userInDb = await User.findOne({ email: validUser.email }).select("+password");
      expect(userInDb?.password).not.toBe(validUser.password); // never stored raw
    });

    it("should reject signup with a duplicate email (409)", async () => {
      await request(app).post("/api/auth/signup").send(validUser);
      const res = await request(app).post("/api/auth/signup").send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it("should reject signup with an invalid email (400)", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validUser, email: "not-an-email" });

      expect(res.status).toBe(400);
    });

    it("should reject signup with a short password (400)", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validUser, password: "short" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // seed a user to log in against
      await request(app).post("/api/auth/signup").send(validUser);
    });

    it("should log in with correct credentials and return 200", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should reject login with wrong password (401)", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: validUser.email,
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
    });

    it("should reject login with unknown email (401)", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "nobody@example.com",
        password: validUser.password,
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should reject an unauthenticated request (401)", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("should return the current user when authenticated", async () => {
      const agent = request.agent(app); // agent persists cookies across requests

      await agent.post("/api/auth/signup").send(validUser);
      const res = await agent.get("/api/auth/me");

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(validUser.email);
    });
  });
});