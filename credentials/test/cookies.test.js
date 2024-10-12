const getCookies = require("../cookies");

let response; 

beforeAll(async () => {
    response = await getCookies("https://www.google.com/");
});

test("Expect getCookies to fetch cookies from an url", async () => {
    expect(response).toBeDefined()
});

test("Expect getCookies to return an array of cookies", async () => {
    expect(response.length).toBeGreaterThan(0)
});