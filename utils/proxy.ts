const puppeteerExtra = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");
const randomUseragent = require("random-useragent");
const logger = require("./logger");
const config = require("./config");

class Proxy {
  browser: any;
  page: any;
  pageOptions: any;
  waitForFunction: string;
  isLinkCrawlTest: boolean;
  responseBody: string;

  constructor() {
    this.browser = null;
    this.page = null;
    this.pageOptions = null;
    this.waitForFunction = 'document.querySelector("body")';
    this.isLinkCrawlTest = false;
    this.responseBody = "";
  }

  async initiateProfileQuery(countsLimitsData: number, id: string) {
    logger.info("initiating profile query!");
    this.pageOptions = {
      waitUntil: "networkidle2",
      timeout: countsLimitsData * 1000,
    };
    puppeteerExtra.use(pluginStealth());
    this.browser = await puppeteerExtra.launch({
      headless: true,
      args: ["--no-sandbox"],
    });
    this.page = await this.browser.newPage();
    await this.page.setRequestInterception(true);
    this.page.on("request", (request: any) => {
      if (
        ["image", "stylesheet", "font", "script"].indexOf(
          request.resourceType()
        ) !== -1
      ) {
        request.abort();
      } else {
        logger.info("posting data ....");
        request.continue({
          method: "POST",
          postData: JSON.stringify({
            PublicKeyBase58Check: id,
          }),
          headers: {
            ...request.headers(),
            "Content-Type": "application/json",
          },
        });
      }
    });
    this.page.on("requestfailed", (request: any) => {
      logger.info(request.url() + " " + request.failure().errorText);
    });
    this.isLinkCrawlTest = true;
  }

  async initiateSendBitclout(
    countsLimitsData: number,
    id: string,
    amount: number
  ) {
    this.pageOptions = {
      waitUntil: "networkidle2",
      timeout: countsLimitsData * 1000,
    };
    this.waitForFunction = 'document.querySelector("body")';
    puppeteerExtra.use(pluginStealth());
    this.browser = await puppeteerExtra.launch({
      headless: true,
      args: ["--no-sandbox"],
    });
    this.page = await this.browser.newPage();
    await this.page.setRequestInterception(true);
    this.page.on("request", (request: any) => {
      if (
        ["image", "stylesheet", "font", "script"].indexOf(
          request.resourceType()
        ) !== -1
      ) {
        request.abort();
      } else {
        request.continue({
          method: "POST",
          postData: JSON.stringify({
            AmountNanos: amount,
            Broadcast: true,
            MinFeeRateNanosPerKB: 1000,
            Password: "",
            RecipientPublicKeyOrUsername: id,
            SeedInfo: null,
            SenderPublicKeyBase58Check:
              "BC1YLjQtaLyForGFpdzmvzCCx1zbSCm58785cABn5zS8KVMeS4Z4aNK",
            Sign: true,
            Validate: true,
          }),
          headers: {
            ...request.headers(),
            "Content-Type": "application/json",
            cookie: `seed_info_cookie_key-BC1YLjQtaLyForGFpdzmvzCCx1zbSCm58785cABn5zS8KVMeS4Z4aNK="{'HasPassword':false,'HasExtraText':false,'EncryptedSeedHex':'${config.ENCRYPTEDSEEDHEX}','PwSaltHex':'${config.PWSALTHEX}','Pbkdf2Iterations':10,'BtcDepositAddress':'14Jhq68xzi9vo5rg12fAsKjvgxWjE4e9Qd','IsTestnet':false}";`,
          },
        });
      }
    });
    this.page.on("requestfailed", (request: any) => {
      logger.info(request.url() + " " + request.failure().errorText);
    });
    this.isLinkCrawlTest = true;
  }

  async crawlTransactionInfo() {
    logger.info("starting crawl");
    const link = "https://api.bitclout.com/api/v1/transaction-info";
    const userAgent = randomUseragent.getRandom();
    const crawlResults = { isValidPage: true, pageSource: null };
    try {
      await this.page.setUserAgent(userAgent);
      logger.info("going to link: ", link);
      const resp = await this.page.goto(link, this.pageOptions);
      await this.page.waitForFunction(this.waitForFunction);
      crawlResults.pageSource = await this.page.content();
      this.responseBody = await resp.text();
      return this.responseBody;
    } catch (error) {
      crawlResults.isValidPage = false;
      logger.error(error);
      throw error;
    }
    if (this.isLinkCrawlTest) {
      this.close();
    }
  }
  async sendBitclout() {
    logger.info("starting crawl");
    const link = "https://api.bitclout.com/send-bitclout";
    const userAgent = randomUseragent.getRandom();
    const crawlResults = { isValidPage: true, pageSource: null };
    try {
      await this.page.setUserAgent(userAgent);
      logger.info("going to link: ", link);
      const resp = await this.page.goto(link, this.pageOptions);
      await this.page.waitForFunction(this.waitForFunction);
      crawlResults.pageSource = await this.page.content();
      this.responseBody = await resp.text();
      return this.responseBody;
    } catch (error) {
      crawlResults.isValidPage = false;
      logger.error(error);
      throw error;
    }
    if (this.isLinkCrawlTest) {
      this.close();
    }
  }

  close() {
    if (!this.browser) {
      this.browser.close();
    }
  }
}

const proxy = new Proxy();

export default proxy;
