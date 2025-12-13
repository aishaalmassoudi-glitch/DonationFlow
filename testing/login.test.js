const fs = require("fs");
const path = require("path");
const { attachLoginHandler } = require("./login.js");

const html = fs.readFileSync(
  path.resolve(__dirname, "../public/login.html"),
  "utf8"
);

beforeEach(() => {
  // Reset DOM before each test
  document.body.innerHTML = html;
  // Attach the login button handler after DOM is ready
  attachLoginHandler();
});

test("shows error when username is empty", async () => {
  const loginBtn = document.getElementById("loginBtn");
  document.getElementById("username").value = "";
  document.getElementById("password").value = "1234";

  // Simulate click
  loginBtn.click();

  // Wait for the event loop to process the click handler
  await new Promise(process.nextTick);

  const errorDiv = document.querySelector(".error");
  expect(errorDiv.textContent).toBe("الرجاء إدخال معلومات الدخول");
});
