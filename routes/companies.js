"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Company = require("../models/company");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");
const { max } = require("pg/lib/defaults");

const router = new express.Router();


/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: admin
 */

router.post("/", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyNewSchema);
    console.log(req)
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.create(req.body);
    return res.status(201).json({ company });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  const name = req.query.name;
  const min = req.query.minEmployees;
  const max = req.query.maxEmployees;
  try {
    if(min && !max && !name) {
      const companies = await Company.filByMinNum(parseInt(min));
      return res.json({ companies });
    }else if(max && !min && !name) {
      const companies = await Company.filByMaxNum(parseInt(max));  
      return res.json({ companies });
    }else if(name && !min && !max) {
      const companies = await Company.filByName(name);
      return res.json({ companies });
    }else if(name && min && !max) {
      const companies = await Company.filByNameNMinNum(name, parseInt(min));
      return res.json({ companies });
    }else  if(name && max && !min) {
      const companies = await Company.filByNameNMaxNum(name,parseInt(max));
      return res.json({ companies });
    }else if(name && min && max) {
      const companies = await Company.filByNameNNum(name,parseInt(min),parseInt(max));
      return res.json({ companies });
    }else if(min && max && !name) {
      const companies = await Company.filByNum(parseInt(min),parseInt(max));
      return res.json({ companies });
    }
    const companies = await Company.findAll();
    return res.json({ companies });
  } catch (err) {
    return next(err);
  }
});


// router.get("/:name?/:minEmployees?/:maxEmployees?", async function (req, res,next) {
//   try{
//     const name = req.params.name;
//     const minEmployees = req.params.minEmployees;
//     const maxEmployees = req.params.maxEmployees;
    
//     if(name && minEmployees && maxEmployees) {
//       const companies = await Company.filByNameNNum(name,parseInt(minEmployees),parseInt(maxEmployees))
//       return res.json({companies})
//     }else if(name && minEmployees){
//       const companies = await Company.filByNameNMinNum(name, parseInt(minEmployees));
//       return res.json({ companies });
//     }
//     else if(name){
//       const companies = await Company.filByName(name);
//       return res.json({ companies });
//     }else{
//       const companies = await Company.findAll();
//       return res.json({ companies });
//     }
//   }catch(err){
//     return next(err);
//   }
// })

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  try {
    const company = await Company.get(req.params.handle);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: admin
 */

router.patch("/:handle", ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyUpdateSchema);
    console.log("helloooooooooooooo")
    console.log(req.body)
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.update(req.params.handle, req.body);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login
 */

router.delete("/:handle", ensureAdmin, async function (req, res, next) {
  try {
    await Company.remove(req.params.handle);
    return res.json({ deleted: req.params.handle });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
