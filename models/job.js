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
    
      static async findAll() {
        const jobsRes = await db.query(
              `SELECT id, title, salary, equity, company_handle
               FROM jobs
               ORDER BY id`);
        return jobsRes.rows;
      }

      /**
       * Find jobs contains passed in title.
       * 
       * Return [{ id, title, salary, equity, company_handle},...]
      * */

      static async filByTitle(title) {
        const jobsRes = await db.query(
            `SELECT id, title, salary, equity, company_handle
            FROM jobs
            WHERE title ILIKE $1
            ORDER BY id`, [`%${title}%`]
        );
        if(jobsRes.rows.length === 0){
            throw new BadRequestError("no such job title")
        }
        return jobsRes.rows;
      }

      /**
       * 
       * Find jobs has min salary
       * 
       * Return [{ id, title, salary, equity, company_handle},...]
       * */ 

      static async filByMin(minSalary) {
        const jobsRes = await db.query(
            `SELECT id, title, salary, equity, company_handle
            FROM jobs
            WHERE salary >= $1
            ORDER BY id`, [minSalary]
        )
        if(jobsRes. rows.length === 0) {
            throw new BadRequestError(`no job salary greater than : ${minSalary}`,400 )
        }
        return jobsRes.rows;
      }

      /**
       * 
       * Find jobs by filtering equity
       * 
       * Return [{ id, title, salary, equity, company_handle},...]
       * 
       * */ 

      static async filByEquity(hasEquity) {
        if(hasEquity === "true") {
            const jobsRes = await db.query(
                `SELECT id, title, salary, equity, company_handle
                FROM jobs
                WHERE equity != '0'
                ORDER BY id`,
            )
            if(jobsRes.rows.length === 0) {
                throw new BadRequestError("No found")
            }
            return jobsRes.rows;
        }else{
            const jobs = await this.findAll();
            return jobs;
        }
        
      }

      /**
       * 
       * Find jobs includes title term with min salary
       * 
       * Return [{ id, title, salary, equity, company_handle},...]
       * 
       * */ 

      static async filByTitleNMin(title, minSalary) {
        const jobsRes = await db.query(
          `SELECT id, title, salary, equity, company_handle
          FROM jobs
          WHERE (title ILIKE $1
          AND
          salary >= $2)
          ORDER BY id`,[`%${title}%`,minSalary]
      );
      if(jobsRes.rows.length === 0) {
        throw new BadRequestError(`no such job title`,400 )
      }
       return jobsRes.rows;
      }

       /**
       * 
       * Find jobs includes title term with equity
       * 
       * Return [{ id, title, salary, equity, company_handle},...]
       * 
       * */ 


      static async filByTitleNEquity(title, hasEquity) {
        if(hasEquity === "true") {
          const jobsRes = await db.query(
              `SELECT id, title, salary, equity, company_handle
              FROM jobs
              WHERE (title ILIKE $1
              AND equity != 0)
              ORDER BY id`,[`%${title}%`]
          )
          if(jobsRes.rows.length === 0) {
              throw new BadRequestError("No found such job title")
          }
          return jobsRes.rows;
        }else{
          const jobs = await this.filByTitle(title);
          return jobs;
        }
      }

       /**
       * 
       * Find jobs includes title term with min salary and equity
       * 
       * Return [{ id, title, salary, equity, company_handle},...]
       * 
       * */ 


      static async filByAll(title, minSalary, hasEquity) {
        if(hasEquity === "true") {
          const jobsRes = await db.query(
              `SELECT id, title, salary, equity, company_handle
              FROM jobs
              WHERE (title ILIKE $1
              AND salary >= $2
              AND equity != 0)
              ORDER BY id`,[`%${title}%`,minSalary]
          )
          if(jobsRes.rows.length === 0) {
              throw new BadRequestError("No found such job title")
          }
          return jobsRes.rows;
        }else{
          const jobs = await this.filByTitleNMin(title,minSalary);
          return jobs;
        }
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


