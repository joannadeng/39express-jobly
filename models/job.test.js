"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "t1",
    salary: 9999,
    equity: "0",
    company_handle:"c1"
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual( 
    {
        id:expect.any(Number),
        title: "t1",
        salary: 9999,
        equity: "0",
        company_handle:"c1"
    });

    const result = await db.query(
          `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE title = 't1'
           AND company_handle = 'c1'`);
    expect(result.rows[0]).toEqual(newJob);
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let companies = await Job.findAll();
    expect(companies).toEqual([
        {
            id:expect.any(Number),
            title:"j1",
            salary:2222,
            equity:"0",
            company_handle:"c1"
        },
        {
            id:expect.any(Number),
            title:"j2",
            salary:3333,
            equity:"0",
            company_handle:"c2"
        },
        {
            id:expect.any(Number),
            title:"j3",
            salary:4444,
            equity:"0.1",
            company_handle:"c3"
        },
    ]);
  });

  test("filter by title", async function() {
    let jobs = await Job.filByTitle("j1");
    expect(jobs).toEqual([
      {
        id:expect.any(Number),
        title:"j1",
        salary:2222,
        equity:"0",
        company_handle:"c1"
      }
    ]);
  });

  test("filter by minSalary", async function() {
    let jobs = await Job.filByMin(3333);
    expect(jobs).toEqual([
        {
            id:expect.any(Number),
            title:"j2",
            salary:3333,
            equity:"0",
            company_handle:"c2"
        },
        {
            id:expect.any(Number),
            title:"j3",
            salary:4444,
            equity:"0.1",
            company_handle:"c3"
        },
    ]);
  });

  test("filter by title and min salary", async function() {
    let jobs = await Job.filByTitleNMin("j",4444);
    expect(jobs).toEqual([
        {
            id:expect.any(Number),
            title:"j3",
            salary:4444,
            equity:"0.1",
            company_handle:"c3"
        },
    ]);
  });

  test("filter by hasEquity", async function() {
    let jobs = await Job.filByEquity("true");
    expect(jobs).toEqual([
      {
        id:expect.any(Number),
            title:"j3",
            salary:4444,
            equity:"0.1",
            company_handle:"c3"
      }
    ]);
  });

  test("filter by title and equity ", async function() {
    let jobs = await Job.filByTitleNEquity('j',"true");
    expect(jobs).toEqual([
      {
        id:expect.any(Number),
            title:"j3",
            salary:4444,
            equity:"0.1",
            company_handle:"c3"
      }
    ])
  });

  test("filter by title, min salary and equity ", async function() {
    let jobs = await Job.filByAll('j',4000,"true");
    expect(jobs).toEqual([
      {
        id:expect.any(Number),
            title:"j3",
            salary:4444,
            equity:"0.1",
            company_handle:"c3"
      }
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let newJob = await Job.create(
      {
        title: "t1",
        salary: 9999,
        equity: "0",
        company_handle:"c1"
      }
    );
    let job = await Job.get(newJob.id)
    expect(job).toEqual({
      id: expect.any(Number),
      title: "t1",
        salary: 9999,
        equity: "0",
        company_handle:"c1"
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const job = {
    title: "t1",
    salary: 9999,
    equity: "0",
    company_handle:"c1"
  };

  const updateData = {
    title: "t11",
    salary: 19999,
    equity: "0.1",
  };

  test("works", async function () {
    let newJob = await Job.create(job);
    let updatedJob = await Job.update(newJob.id, updateData);
    expect(updatedJob).toEqual({
      id:newJob.id, 
      company_handle:"c1",
      ...updateData,
    });

    const result = await db.query(
          `SELECT id,title,salary,equity,company_handle
           FROM jobs
           WHERE id = ${newJob.id} `);
    expect(result.rows).toEqual([{
      id:newJob.id, 
      company_handle:"c1",
      ...updateData,
    }]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "t11",
      salary: null,
      equity: null,
    };

    let newJob = await Job.create(job);
    let updatedJob = await Job.update(newJob.id, updateDataSetNulls);
    expect(updatedJob).toEqual({
      id:newJob.id, 
      company_handle:"c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
          `SELECT id,title,salary,equity,company_handle
          FROM jobs
          WHERE id = ${newJob.id} `);
    expect(result.rows).toEqual([{
      id:newJob.id, 
      company_handle:"c1",
      ...updateDataSetNulls
    }]);
  });

  test("not found if no such job id", async function () {
    try {
      await Job.update(0, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    const job = {
      title: "t1",
      salary: 9999,
      equity: "0",
      company_handle:"c1"
    };
    let newJob = await Job.create(job);
    try {
      await Job.update(newJob.id, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  const job = {
    title: "t1",
    salary: 9999,
    equity: "0",
    company_handle:"c1"
  };
  test("works", async function () {
    let newJob = await Job.create(job);
    await Job.remove(newJob.id);
    const res = await db.query(
        `SELECT * FROM jobs WHERE id= ${newJob.id}`);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Job.remove(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
