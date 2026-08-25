import { Router } from "express";
import { listActiveVehicles } from "./vehicles.service";

export const publicVehiclesRouter = Router();

publicVehiclesRouter.get("/", async (req, res) => {
  const vehicles = await listActiveVehicles();
  res.json(vehicles);
});
