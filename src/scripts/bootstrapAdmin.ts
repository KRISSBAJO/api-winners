import dotenv from "dotenv";
import { connectDB } from "../config/db";
import { ensureBootstrapAdmin } from "../utils/bootstrapAdmin";

dotenv.config();

(async () => {
  await connectDB();
  await ensureBootstrapAdmin();
  process.exit(0);
})();
