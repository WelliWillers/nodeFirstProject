import { FastifyInstance } from "fastify";
import crypto, { randomUUID } from "node:crypto";
import { z } from "zod";
import { knex } from "../database";
import { checkSessionIdExist } from "../middlewares/check-session-id-exist";

export async function transactionsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", async (req, res) => {
    console.log("Teste de handle");
  });

  app.get(
    "/",
    {
      preHandler: [checkSessionIdExist],
    },
    async (req, res) => {
      const sessionId = req.cookies.sessionId;

      const transactions = await knex("transactions")
        .select()
        .where("session_id", sessionId);

      return { transactions };
    }
  );

  app.get(
    "/summary",
    {
      preHandler: [checkSessionIdExist],
    },
    async (req, res) => {
      const sessionId = req.cookies.sessionId;
      const summary = await knex("transactions")
        .where("session_id", sessionId)
        .sum("amount", { as: "amount" })
        .first();

      return { summary };
    }
  );

  app.get(
    "/:id",
    {
      preHandler: [checkSessionIdExist],
    },
    async (req, res) => {
      const sessionId = req.cookies.sessionId;

      const getTransactionParamsSchema = z.object({
        id: z.string().uuid(),
      });

      const { id } = getTransactionParamsSchema.parse(req.params);

      const transactions = await knex("transactions")
        .where({ id, session_id: sessionId })
        .first();

      return { transactions };
    }
  );

  app.post("/", async (req, res) => {
    const createTransactionsBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(["credit", "debit"]),
    });

    const { amount, title, type } = createTransactionsBodySchema.parse(
      req.body
    );

    let sessionId = req.cookies.sessionId;

    if (!sessionId) {
      sessionId = randomUUID();

      res.cookie("sessionId", sessionId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 daus
      });
    }

    await knex("transactions").insert({
      id: crypto.randomUUID(),
      title,
      amount: type === "credit" ? amount : amount * -1,
      session_id: sessionId,
    });

    return res.status(201).send();
  });
}
