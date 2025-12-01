require("dotenv").config();
const app = require("./app.cjs");

const PORT = process.env.PORT || 5070;

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});


