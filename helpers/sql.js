const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.

/**
 * 
 * This is a function that extract the columns and values of the database that need to be updated. and transfer into sql syntax
 * 
 * dataToUpdate is an object includes the data need to be updated
 * {firstName: 'Aliya', age: 32}
 * 
 * jsToSql is an Object translate the key names in dataToUpdate to the corresponding column name in database tables
 * {
    firstName: "first_name",
    lastName: "last_name",
    isAdmin: "is_admin",
  }

  jsToSql can be {}
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) {
    throw new BadRequestError("No data");
  }

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),  //'"first_name"=$1,"age"=$2'
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
