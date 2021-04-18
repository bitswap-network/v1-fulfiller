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