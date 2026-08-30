import express from "express"

const app = express()
const PORT = 3000;

app.get("/health", (req, res) => {
  res.json({
    name: "node server",
    status: "ok"
  });
});

app.listen(PORT, () => {
  console.log(`Server Backend running on http://loaclhost:${PORT}`)
})