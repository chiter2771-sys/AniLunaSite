import { Router, type IRouter } from "express";
import healthRouter from "./health";
import animeRouter from "./anime";
import profileRouter from "./profile";
import historyRouter from "./history";
import libraryRouter from "./library";
import commentsRouter from "./comments";
import ratingsRouter from "./ratings";
import collectionsRouter from "./collections";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(animeRouter);
router.use(profileRouter);
router.use(historyRouter);
router.use(libraryRouter);
router.use(commentsRouter);
router.use(ratingsRouter);
router.use(collectionsRouter);
router.use(statsRouter);

export default router;
