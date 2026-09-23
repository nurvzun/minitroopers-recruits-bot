import { chromium } from "playwright";

// Paste the recruit page link here, the page that says "Create your army!".
const START_URL = "INSERT_LINK_HERE";
const COUNT = Number(process.env.COUNT || 50);

if (!START_URL.startsWith("http") || START_URL.includes("INSERT_LINK_HERE")) {
  console.error("Open create-armies.mjs and replace INSERT_LINK_HERE with your recruit page link.");
  process.exit(1);
}

const LEFT = [
  "amber", "brisk", "cobalt", "dusty", "ember", "flint", "gloom", "haven",
  "ivory", "jade", "keen", "lunar", "misty", "noble", "onyx", "pride",
  "quartz", "rapid", "solar", "thorn", "umbra", "vivid", "witty", "xenon",
  "zinc", "bold", "crisp", "dusk", "frost", "grim",
];

const RIGHT = [
  "army", "bolt", "crew", "fang", "hawk", "iris", "jack", "lynx", "mink",
  "nova", "pike", "rook", "stag", "tiger", "ursa", "viper", "wolf", "yak",
  "fox", "ram",
];

function randomName() {
  const left = LEFT[Math.floor(Math.random() * LEFT.length)];
  const right = RIGHT[Math.floor(Math.random() * RIGHT.length)];
  const n = Math.floor(Math.random() * 90) + 10;
  return `${left}-${right}${n}`.slice(0, 16);
}

async function createOne(browser, index) {
  const name = randomName();
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto(START_URL, { waitUntil: "domcontentloaded" });
    await page.locator("#name").waitFor({ state: "visible" });
    await page.locator("li.trooper").first().click();
    await page.locator("#name").fill(name);
    await page.locator("#submit:not([disabled])").click({ timeout: 20000 });
    const outcome = await Promise.race([
      page.waitForURL("**/hq", { timeout: 20000, waitUntil: "commit" }).then(() => "hq"),
      page.getByText("Maximum number of armies reached").waitFor({ timeout: 20000 }).then(() => "max"),
    ]);
    if (outcome === "max") {
      console.log(`${index}/${COUNT}  ${name}  STOP  maximum number of armies reached for this device`);
      return { name, ok: false, stop: true };
    }
    await page.waitForTimeout(1200);
    const url = page.url();
    console.log(`${index}/${COUNT}  ${name}  ${url}`);
    return { name, url, ok: true };
  } catch (error) {
    console.log(`${index}/${COUNT}  ${name}  FAILED  ${error.message}`);
    return { name, ok: false, error: error.message };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
});

const results = [];
try {
  for (let i = 1; i <= COUNT; i++) {
    const result = await createOne(browser, i);
    results.push(result);
    if (result.stop) break;
  }
} finally {
  await browser.close();
}

const made = results.filter((r) => r.ok).length;
console.log(`done: ${made}/${COUNT}`);
if (made !== COUNT) process.exitCode = 1;
