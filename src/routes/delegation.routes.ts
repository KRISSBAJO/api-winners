import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  createDelegation,
  listMine,
  listActiveForMe,
  revokeDelegation,
} from "../controllers/delegation.controller";

// We rely on controller's internal scope checks; keep routes simple
const router = Router();

/**
 * POST /delegations
 * body: { granteeId, scope{...}, permissions[]? | roleLike?, startsAt, endsAt, reason? }
 */
router.post("/", authenticate(), createDelegation);

/** GET /delegations/mine?as=grantor|grantee&active=1 */
router.get("/mine", authenticate(), listMine);

/** GET /delegations/for-me  (active delegations where I'm grantee) */
router.get("/for-me", authenticate(), listActiveForMe);

/** POST /delegations/:id/revoke */
router.post("/:id/revoke", authenticate(), revokeDelegation);

export default router;
