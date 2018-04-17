const puppeteer = require('puppeteer');
const moment = require('moment');

moment.locale('pt-br');

const articleListClass = "list-default rect-darkred";
const articleClass = "list-item";

const totalDaysToFetch = 30;
let articlesFound =[];
let pageNumber = 1;
let lastArticleDate = moment();

(async () => {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    while (lastArticleDate > moment().subtract(totalDaysToFetch, 'days')) {
        await page.goto('https://www.empiricus.com.br/conteudo/newsletters/page/' + pageNumber, {"waitUntil" : "networkidle0"});

        let articlesOnPage = await page.evaluate((sel) => {
            return document.getElementsByClassName(sel).length;
        }, articleClass);

        for (i= 1; i <= articlesOnPage; i++) {

            //Driblando o lazy loading dos thumbnails
            let articleItemHeight = await page.evaluate((selector) => {
                let e = document.querySelector(selector);
                return e ? e.getBoundingClientRect().top : null;
            }, "ul.list-default > li:nth-child(" + i + ")");
            await page.evaluate('window.scrollBy(0, '+ articleItemHeight +')');
            await page.waitFor(2000);

            //Imagem
            let image = await page.evaluate((selector) => {
                let e = document.querySelector(selector).getAttribute('src');
                return e ? e : null;
            }, "ul.list-default > li:nth-child(" + i + ") div.list-item--thumb > img");

            //Titulo
            let title = await page.evaluate((selector) => {
                let e = document.querySelector(selector);
                return e ? e.innerHTML : null;
            }, "ul.list-default > li:nth-child(" + i + ") div.list-item--meta > h2");

            //Data
            let data = await page.evaluate((selector) => {
                let e = document.querySelector(selector);
                return e ? e.innerHTML.split(' - ')[1] : null;
            }, "ul.list-default > li:nth-child(" + i + ") div.list-item--meta > p.list-item--info");

            //Descrição
            let description = await page.evaluate((selector) => {
                let e = document.querySelector(selector);
                return e ? e.innerHTML : null;
            }, "ul.list-default > li:nth-child(" + i + ") div.list-item--meta > p.list-item--description");

            //URL
            let url = await page.evaluate((selector) => {
                let e = document.querySelector(selector).getAttribute('href');
                return e ? e : null;
            }, "ul.list-default > li:nth-child(" + i + ") article.list-item > a");

            //HTML da notícia
            let articlePage = await browser.newPage();
            await articlePage.goto(url, {"waitUntil" : "networkidle0"});
            let html = await articlePage.evaluate((selector) => {
                let e = document.querySelector(selector);
                return e ? e.innerHTML : null;
            }, "article.article > div#article-content");
            await articlePage.close();

            if (moment(data, "DD ** MMMM, YYYY") > moment().subtract(totalDaysToFetch, 'days')) {
                await articlesFound.push({
                    imagem: image,
                    titulo: title,
                    data: data,
                    descricao: description,
                    url: url,
                    html: html
                });

                console.log(articlesFound);
            }

            lastArticleDate = moment(data, "DD ** MMMM, YYYY");
        }

        console.log("Page number: " + pageNumber);
        console.log("Articles fetched: " + articlesFound.length);

        pageNumber++;
    }

    console.log(JSON.stringify(articlesFound));

    await browser.close();

})();

  