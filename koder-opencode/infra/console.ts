import { deployAws, domain } from "./stage"
import { EMAILOCTOPUS_API_KEY } from "./app"
import { SECRET } from "./secret"

const lake = deployAws ? await import("./lake") : undefined

////////////////
// DATABASE
////////////////

const cluster = planetscale.getDatabaseOutput({
  name: "opencode",
  organization: "anomalyco",
})

const branch =
  $app.stage === "production"
    ? planetscale.getBranchOutput({
        name: "production",
        organization: cluster.organization,
        database: cluster.name,
      })
    : new planetscale.Branch("DatabaseBranch", {
        database: cluster.name,
        organization: cluster.organization,
        name: $app.stage,
        parentBranch: "production",
      })
const password = new planetscale.Password("DatabasePassword", {
  name: $app.stage,
  database: cluster.name,
  organization: cluster.organization,
  branch: branch.name,
})

export const database = new sst.Linkable("Database", {
  properties: {
    host: password.accessHostUrl,
    database: cluster.name,
    username: password.username,
    password: password.plaintext,
    port: 3306,
  },
})

new sst.x.DevCommand("Studio", {
  link: [database],
  dev: {
    command: "bun db studio",
    directory: "packages/console/core",
    autostart: true,
  },
})

////////////////
// AUTH
////////////////

const GITHUB_CLIENT_ID_CONSOLE = new sst.Secret("GITHUB_CLIENT_ID_CONSOLE")
const GITHUB_CLIENT_SECRET_CONSOLE = new sst.Secret("GITHUB_CLIENT_SECRET_CONSOLE")
const GOOGLE_CLIENT_ID = new sst.Secret("GOOGLE_CLIENT_ID")
const authStorage = new sst.cloudflare.Kv("AuthStorage")
export const auth = new sst.cloudflare.Worker("AuthApi", {
  domain: `auth.${domain}`,
  handler: "packages/console/function/src/auth.ts",
  url: true,
  link: [database, authStorage, GITHUB_CLIENT_ID_CONSOLE, GITHUB_CLIENT_SECRET_CONSOLE, GOOGLE_CLIENT_ID],
})

////////////////
// GATEWAY
////////////////

// Razorpay prices are managed in the Razorpay Dashboard.
// These Linkables expose the price/product IDs as environment variables
// to the Console worker. The actual IDs must be set via SST secrets.
const RAZORPAY_KEY_ID = new sst.Secret("RAZORPAY_KEY_ID")
const RAZORPAY_KEY_SECRET = new sst.Secret("RAZORPAY_KEY_SECRET")
const RAZORPAY_WEBHOOK_SECRET = new sst.Secret("RAZORPAY_WEBHOOK_SECRET")

const ZEN_LITE_PRICE = new sst.Linkable("ZEN_LITE_PRICE", {
  properties: {
    product: process.env.ZEN_LITE_PRODUCT_ID || "lite",
    price: process.env.ZEN_LITE_PRICE_ID || "price_lite",
    priceInr: 92900,
    firstMonth50Coupon: process.env.ZEN_LITE_COUPON_50 || "",
    firstMonth100Coupon: process.env.ZEN_LITE_COUPON_100 || "",
    threeMonths100Coupon: process.env.ZEN_LITE_COUPON_3M || "",
    sixMonths100Coupon: process.env.ZEN_LITE_COUPON_6M || "",
    twelveMonths100Coupon: process.env.ZEN_LITE_COUPON_12M || "",
  },
})

const ZEN_BLACK_PRICE = new sst.Linkable("ZEN_BLACK_PRICE", {
  properties: {
    product: process.env.ZEN_BLACK_PRODUCT_ID || "black",
    plan200: process.env.ZEN_BLACK_PRICE_200 || "price_black_200",
    plan100: process.env.ZEN_BLACK_PRICE_100 || "price_black_100",
    plan20: process.env.ZEN_BLACK_PRICE_20 || "price_black_20",
  },
})

const ZEN_MODELS = [
  new sst.Secret("ZEN_MODELS1"),
  new sst.Secret("ZEN_MODELS2"),
  new sst.Secret("ZEN_MODELS3"),
  new sst.Secret("ZEN_MODELS4"),
  new sst.Secret("ZEN_MODELS5"),
  new sst.Secret("ZEN_MODELS6"),
  new sst.Secret("ZEN_MODELS7"),
  new sst.Secret("ZEN_MODELS8"),
  new sst.Secret("ZEN_MODELS9"),
  new sst.Secret("ZEN_MODELS10"),
  new sst.Secret("ZEN_MODELS11"),
  new sst.Secret("ZEN_MODELS12"),
  new sst.Secret("ZEN_MODELS13"),
  new sst.Secret("ZEN_MODELS14"),
  new sst.Secret("ZEN_MODELS15"),
  new sst.Secret("ZEN_MODELS16"),
  new sst.Secret("ZEN_MODELS17"),
  new sst.Secret("ZEN_MODELS18"),
  new sst.Secret("ZEN_MODELS19"),
  new sst.Secret("ZEN_MODELS20"),
  new sst.Secret("ZEN_MODELS21"),
  new sst.Secret("ZEN_MODELS22"),
  new sst.Secret("ZEN_MODELS23"),
  new sst.Secret("ZEN_MODELS24"),
  new sst.Secret("ZEN_MODELS25"),
  new sst.Secret("ZEN_MODELS26"),
  new sst.Secret("ZEN_MODELS27"),
  new sst.Secret("ZEN_MODELS28"),
  new sst.Secret("ZEN_MODELS29"),
  new sst.Secret("ZEN_MODELS30"),
]
const AUTH_API_URL = new sst.Linkable("AUTH_API_URL", {
  properties: { value: auth.url.apply((url) => url!) },
})

////////////////
// CONSOLE
////////////////

const bucket = new sst.cloudflare.Bucket("ZenData")
const bucketNew = new sst.cloudflare.Bucket("ZenDataNew")

const DISCORD_INCIDENT_WEBHOOK_URL = new sst.Secret("DISCORD_INCIDENT_WEBHOOK_URL")
const AWS_SES_ACCESS_KEY_ID = new sst.Secret("AWS_SES_ACCESS_KEY_ID")
const AWS_SES_SECRET_ACCESS_KEY = new sst.Secret("AWS_SES_SECRET_ACCESS_KEY")

const SALESFORCE_CLIENT_ID = new sst.Secret("SALESFORCE_CLIENT_ID")
const SALESFORCE_CLIENT_SECRET = new sst.Secret("SALESFORCE_CLIENT_SECRET")
const SALESFORCE_INSTANCE_URL = new sst.Secret("SALESFORCE_INSTANCE_URL")

const logProcessor = new sst.cloudflare.Worker("LogProcessor", {
  handler: "packages/console/function/src/log-processor.ts",
  link: [SECRET.HoneycombApiKey, ...(lake?.lakeIngest ? [lake.lakeIngest] : [])],
})

new sst.cloudflare.x.SolidStart("Console", {
  domain,
  path: "packages/console/app",
  link: [
    bucket,
    bucketNew,
    database,
    SECRET.UpstashRedisRestUrl,
    SECRET.UpstashRedisRestToken,
    AUTH_API_URL,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET,
    SECRET.SupportApiKey,
    DISCORD_INCIDENT_WEBHOOK_URL,
    SECRET.HoneycombWebhookSecret,
    EMAILOCTOPUS_API_KEY,
    AWS_SES_ACCESS_KEY_ID,
    AWS_SES_SECRET_ACCESS_KEY,
    SALESFORCE_CLIENT_ID,
    SALESFORCE_CLIENT_SECRET,
    SALESFORCE_INSTANCE_URL,
    ZEN_BLACK_PRICE,
    ZEN_LITE_PRICE,
    new sst.Secret("ZEN_LIMITS"),
    new sst.Secret("ZEN_SESSION_SECRET"),
    ...ZEN_MODELS,
    ...($dev
      ? [
          new sst.Secret("CLOUDFLARE_DEFAULT_ACCOUNT_ID", process.env.CLOUDFLARE_DEFAULT_ACCOUNT_ID!),
          new sst.Secret("CLOUDFLARE_API_TOKEN", process.env.CLOUDFLARE_API_TOKEN!),
        ]
      : []),
  ],
  environment: {
    //VITE_DOCS_URL: web.url.apply((url) => url!),
    //VITE_API_URL: gateway.url.apply((url) => url!),
    VITE_AUTH_URL: auth.url.apply((url) => url!),
    VITE_RAZORPAY_KEY_ID: RAZORPAY_KEY_ID.value,
  },
  transform: {
    server: {
      placement: { region: "aws:us-east-2" },
      transform: {
        worker: {
          tailConsumers: [{ service: logProcessor.nodes.worker.scriptName }],
        },
      },
    },
  },
})

////////////////
// HELPERS
////////////////

export const stat = new sst.cloudflare.Worker("Stat", {
  handler: "packages/console/function/src/stat.ts",
  link: [database],
  url: true,
})
