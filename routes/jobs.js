"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
// const { max } = require("pg/lib/defaults");

const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, company_handle }
 *
 * Returns { id, title, salary, equity, company_handle }
 *
 * Authorization required: admin
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { jobs: [ { id, title, salary, equity, company_handle }, ...] }
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
    const title = req.query.title;
    const minSalary = req.query.minSalary;
    const hasEquity = req.query.hasEquity;
  try {
    if(title && !minSalary && !hasEquity){
        const jobs = await Job.filByTitle(title);
        return res.json({jobs})
    }else if(minSalary && !title && !hasEquity) {
        const jobs = await Job.filByMin(minSalary);
        return res.json({jobs});
    }else if(hasEquity && !title && !minSalary) {
        const jobs = await Job.filByEquity(hasEquity);
        return res.json({jobs});
    }else if(title && minSalary && !hasEquity) {
      const jobs = await Job.filByTitleNMin(title, minSalary);
      return res.json({jobs});
    }else if(title && hasEquity && !minSalary) {
      const jobs = await Job.filByTitleNEquity(title,hasEquity);
      return res.json({jobs});
    }else if(title && hasEquity && minSalary) {
      const jobs = await Job.filByAll(title, minSalary, hasEquity);
      return res.json({jobs});
    }
    const jobs = await Job.findAll();
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

/** GET /[id]  =>  { job }
 *
 *  Job is { id, title, salary, equity, company_handle }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.id);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: { title, salary, equity }
 *
 * Returns { id, title, salary, equity, company_title }
 *
 * Authorization required: Admin
 */

router.patch("/:id", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.update(req.params.id, req.body);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: admin
 */

router.delete("/:id", ensureAdmin, async function (req, res, next) {
  try {
    await Job.remove(req.params.id);
    return res.json({ deleted: req.params.id });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
