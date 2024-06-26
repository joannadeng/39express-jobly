"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
// const Job = require("/job")

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(params) {
    const {name, min, max} = params;
    let conditionArr = [];
    let paramsArr = [];
    const query = `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies`;
    
    if(name) {
      paramsArr.push(`%${name}%`);
      conditionArr.push(`name ILIKE $${paramsArr.length}`);
    };
    if(min) {
      paramsArr.push(parseInt(min));
      conditionArr.push(`num_employees >= $${paramsArr.length}`);
    };
    if(max) {
      paramsArr.push(parseInt(max));
      conditionArr.push(`num_employees <= $${paramsArr.length}`);
    };

    let companiesRes;
    if(conditionArr.length > 0) {
      const whereCondition = conditionArr.join(' AND ');
      companiesRes = await db.query(`${query} WHERE ${whereCondition}  ORDER BY name`, paramsArr);
    }else{
      companiesRes = await db.query(`${query} ORDER BY name`)
    };

    if(companiesRes.rows.length === 0) {
      throw new NotFoundError(`Company Not Found`);
    }else{
      return companiesRes.rows;
    }
  }


  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

   const company = companyRes.rows[0];
    if (!company) throw new NotFoundError(`No company: ${handle}`); 

    const jobsRes = await db.query(
      `SELECT id,
              title,
              salary,
              equity
      FROM jobs
      LEFT JOIN
      companies
      ON jobs.company_handle=$1`, [handle]
    )

    const CompJobs = jobsRes.rows;
    if(CompJobs.length === 0) throw new NotFoundError(`this company currently not hiring`);

    company.jobs = CompJobs;

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
