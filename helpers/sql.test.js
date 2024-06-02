const { BadRequestError } = require('../expressError');
const { sqlForPartialUpdate } = require('./sql');

describe("sqlForPartialUpdate", function(){
    test("works: with data", function() {
        const result = sqlForPartialUpdate({firstName: 'Aliya', age: 32},
        {
            firstName: "first_name",
            lastName: "last_name",
            isAdmin: "is_admin",
        });
        expect(result).toEqual({
            setCols: '"first_name"=$1, "age"=$2',
            values: ['Aliya', 32]
        })
    })

    test("works: without data", function() {
        const Operation = () => {
            sqlForPartialUpdate({},
                {
                    firstName: "first_name",
                    lastName: "last_name",
                    isAdmin: "is_admin",
                })
        }
        expect(Operation).toThrow(new BadRequestError("No data"));
    })  
})