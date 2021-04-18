"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteerExtra = require("puppeteer-extra");
const pluginStealth = require("puppeteer-extra-plugin-stealth");
const randomUseragent = require("random-useragent");
const logger = require("./logger");
const config = require("./config");
class Proxy {
    constructor() {
        this.browser = null;
        this.page = null;
        this.pageOptions = null;
        this.waitForFunction = 'document.querySelector("body")';
        this.isLinkCrawlTest = false;
        this.responseBody = "";
    }
    initiateProfileQuery(countsLimitsData, id) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info("initiating profile query!");
            this.pageOptions = {
                waitUntil: "networkidle2",
                timeout: countsLimitsData * 1000,
            };
            puppeteerExtra.use(pluginStealth());
            this.browser = yield puppeteerExtra.launch({
                headless: true,
                args: ["--no-sandbox"],
            });
            this.page = yield this.browser.newPage();
            yield this.page.setRequestInterception(true);
            yield this.page.setJavaScriptEnabled(true);
            yield this.page.setDefaultNavigationTimeout(0);
            this.page.on("request", (request) => {
                if (["image", "stylesheet", "font", "script"].indexOf(request.resourceType()) !== -1) {
                    request.abort();
                }
                else {
                    logger.info("posting data ....");
                    request.continue({
                        method: "POST",
                        postData: JSON.stringify({
                            PublicKeyBase58Check: id,
                        }),
                        headers: Object.assign(Object.assign({}, request.headers()), { "Content-Type": "application/json" }),
                    });
                }
            });
            this.page.on("requestfailed", (request) => {
                logger.info(request.url() + " " + request.failure().errorText);
            });
            this.isLinkCrawlTest = true;
        });
    }
    initiateSendBitclout(countsLimitsData, id, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            this.pageOptions = {
                waitUntil: "networkidle2",
                timeout: countsLimitsData * 1000,
            };
            this.waitForFunction = 'document.querySelector("body")';
            puppeteerExtra.use(pluginStealth());
            this.browser = yield puppeteerExtra.launch({
                headless: true,
                args: ["--no-sandbox"],
            });
            this.page = yield this.browser.newPage();
            yield this.page.setRequestInterception(true);
            yield this.page.setJavaScriptEnabled(true);
            yield this.page.setDefaultNavigationTimeout(0);
            logger.info(config.CFDUID, config.PUBLIC_KEY, config.ENCRYPTEDSEEDHEX, config.PWSALTHEX);
            this.page.on("request", (request) => {
                if (["image", "stylesheet", "font", "script"].indexOf(request.resourceType()) !== -1) {
                    request.abort();
                }
                else {
                    request.continue({
                        method: "POST",
                        postData: JSON.stringify({
                            AmountNanos: amount,
                            Broadcast: true,
                            MinFeeRateNanosPerKB: 1000,
                            Password: "",
                            RecipientPublicKeyOrUsername: id,
                            SeedInfo: null,
                            SenderPublicKeyBase58Check: `${config.PUBLIC_KEY}`,
                            Sign: true,
                            Validate: true,
                        }),
                        headers: Object.assign(Object.assign({}, request.headers()), { "Content-Type": "application/json", cookie: `__cfduid=${config.CFDUID}; seed_info_cookie_key-${config.PUBLIC_KEY}="{'HasPassword':false,'HasExtraText':false,'EncryptedSeedHex':'${config.ENCRYPTEDSEEDHEX}','PwSaltHex':'${config.PWSALTHEX}','Pbkdf2Iterations':10,'BtcDepositAddress':'14Jhq68xzi9vo5rg12fAsKjvgxWjE4e9Qd','IsTestnet':false}";` }),
                    });
                }
            });
            this.page.on("requestfailed", (request) => {
                logger.info(request.url() + " " + request.failure().errorText);
            });
            this.isLinkCrawlTest = true;
        });
    }
    crawlTransactionInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info("starting crawl");
            const link = "https://api.bitclout.com/api/v1/transaction-info";
            const userAgent = randomUseragent.getRandom();
            const crawlResults = { isValidPage: true, pageSource: null };
            try {
                yield this.page.setUserAgent(userAgent);
                logger.info("going to link: ", link);
                const resp = yield this.page.goto(link, this.pageOptions);
                yield this.page.waitForFunction(this.waitForFunction);
                crawlResults.pageSource = yield this.page.content();
                this.responseBody = yield resp.text();
                return this.responseBody;
            }
            catch (error) {
                crawlResults.isValidPage = false;
                logger.error(error);
                throw error;
            }
            if (this.isLinkCrawlTest) {
                this.close();
            }
        });
    }
    sendBitclout() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.info("starting crawl");
            const link = "https://api.bitclout.com/send-bitclout";
            const userAgent = randomUseragent.getRandom();
            const crawlResults = { isValidPage: true, pageSource: null };
            try {
                yield this.page.setUserAgent(userAgent);
                logger.info("going to link: ", link);
                const resp = yield this.page.goto(link, this.pageOptions);
                yield this.page.waitForFunction(this.waitForFunction);
                crawlResults.pageSource = yield this.page.content();
                this.responseBody = yield resp.text();
                return this.responseBody;
            }
            catch (error) {
                crawlResults.isValidPage = false;
                logger.error(error);
                throw error;
            }
            if (this.isLinkCrawlTest) {
                this.close();
            }
        });
    }
    close() {
        if (!this.browser) {
            this.browser.close();
        }
    }
}
const proxy = new Proxy();
exports.default = proxy;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi91dGlscy9wcm94eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQ2hFLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3BELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNuQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFbkMsTUFBTSxLQUFLO0lBUVQ7UUFDRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUN4QixJQUFJLENBQUMsZUFBZSxHQUFHLGdDQUFnQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO1FBQzdCLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFSyxvQkFBb0IsQ0FBQyxnQkFBd0IsRUFBRSxFQUFVOztZQUM3RCxNQUFNLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDekMsSUFBSSxDQUFDLFdBQVcsR0FBRztnQkFDakIsU0FBUyxFQUFFLGNBQWM7Z0JBQ3pCLE9BQU8sRUFBRSxnQkFBZ0IsR0FBRyxJQUFJO2FBQ2pDLENBQUM7WUFDRixjQUFjLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUM7WUFDcEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLGNBQWMsQ0FBQyxNQUFNLENBQUM7Z0JBQ3pDLFFBQVEsRUFBRSxJQUFJO2dCQUNkLElBQUks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