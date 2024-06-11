"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError} = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** related functions for jobs. */

class Job {

     /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * Throws BadRequestError if job already in database.
   * */

     static async create({ title, salary, equity, company_handle }) {
        const duplicateCheck = await db.query(
              `SELECT title
               FROM jobs
               WHERE title = $1
               AND
               company_handle = $2`,
            [title, company_handle]);
    
        if (duplicateCheck.rows[0])
          throw new BadRequestError(`Duplicate job: ${title}`);
    
        const result = await db.query(
              `INSERT INTO jobs
               (title, salary, equity, company_handle)
               VALUES ($1, $2, $3, $4)
               RETURNING id, title, salary, equity, company_handle`,
            [
             title,
             salary,
             equity,
             company_handle,
            ],
        );
        const job = result.rows[0];
    
        return job;
      }
    
      /** Find all jobs.
       *
       * Returns [{ id, title, salary, equity, company_handle }, ...]
       * */
    // refactor 
      static async find(params) {
        const {title, minSalary, hasEquity} = params;
        const query = `SELECT id, title, salary, equity, company_handle
            FROM jobs`;
        let paramsArr = [];
        let conditionArr = [];
        if(title){
          paramsArr.push(`%${title}%`),
          conditionArr.push(`title ILIKE $${paramsArr.length}`)
        }
        if(minSalary){
          paramsArr.push(minSalary);
          conditionArr.push(`salary > $${paramsArr.length}`);
        }
        if((hasEquity+'').toLowerCase() === "true"){
          conditionArr.push(`equity > 0`)
        };

        let jobsRes;
        if(conditionArr.length > 0) {
          console.log(paramsArr)
        const  whereCondition = conditionArr.join(' AND ');
         jobsRes = await db.query(`${query} WHERE ${whereCondition} ORDER BY id`, paramsArr);
        }else{
           jobsRes = await db.query(
                    `${query} 
                     ORDER BY id`);
        };

        if(jobsRes.rows.length !== 0) {
              return jobsRes.rows;
        }else{
              throw new NotFoundError("Not Found")
        };


// my first version 
      //   if(title && minSalary && (hasEquity === "true")) {
      //     jobsRes = await db.query(
      //       `${query} 
      //       WHERE (title ILIKE $1
      //       AND salary >= $2
      //       AND equity != 0)
            // ORDER BY id`,[`%${title}%`,minSalary]
      //   );
      // } else if(title && minSalary) {
      //     jobsRes = await db.query(
      //       `${query} 
      //       WHERE (title ILIKE $1
      //       AND
      //       salary >= $2)
      //       ORDER BY id`,[`%${title}%`,minSalary]
      //   );
      // } else if(title && (hasEquity === "true")) {
      //   jobsRes = await db.query(
      //     `${query} 
      //     WHERE (title ILIKE $1
      //     AND equity != 0)
      //     ORDER BY id`,[`%${title}%`]
      // );
      // } else if ( minSalary && (hasEquity === "true")){
      //   jobsRes = await db.query(
      //     `${query} 
      //     WHERE salary >= $1
      //     AND equity != 0
      //     ORDER BY id`,[minSalary]
      // );
      // }else if(title) {
      //     jobsRes = await db.query(
      //       `${query} 
      //       WHERE title ILIKE $1
      //       ORDER BY id`, [`%${title}%`]
      //   );
      //   } else if (minSalary ) {
      //     jobsRes = await db.query(
      //       `${query} 
      //       WHERE salary >= $1
      //       ORDER BY id`, [minSalary]
      //   );
      //  } else if(hasEquity === "true") {
      //     jobsRes = await db.query(
      //       `${query} 
      //       WHERE equity != '0'
      //       ORDER BY id`,
      //   )
      //   } else{
      //    jobsRes = await db.query(
      //         `${query} 
      //          ORDER BY id`);
      //   // return jobsRes.rows;
      // }
      // if(jobsRes.rows.length === 0){
      //         throw new BadRequestError("Not Found")
      //     }
      //     return jobsRes.rows;
    }

      
      
  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, company_handle }
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobsRes = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = $1`,
        [id]);

    const job = jobsRes.rows[0];

    if (!job) throw new NotFoundError(`No job found`);

    return job;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data,{});
    const idx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idx} 
                      RETURNING id, title, salary, equity, company_handle`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No such job`);

    return job;
  }

  /** Delete given job id from database; returns undefined.
   *
   * Throws NotFoundError if job id not found.
   **/

  static async remove(id) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id, title`,
        [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No such job`);
  }
}


module.exports = Job;


