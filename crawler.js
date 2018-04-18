const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');

moment.locale('pt-br');

const articleClass = "list-item";

const totalDaysToFetch = 30;
let articlesFound =[];
let pageNumber = 1;
let lastArticleDate = moment();

(async () => {
    console.log("Initializing...");
    let startTime = moment();
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();

    while (lastArticleDate > moment().subtract(totalDaysToFetch, 'days')) {
        console.log("Fetching new page...");
        await page.goto('https://www.empiricus.com.br/conteudo/newsletters/page/' + pageNumber, {"waitUntil" : "networkidle0"});

        console.log("Fetching articles...");
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

            //Data
            let data = await page.evaluate((selector) => {
                let e = document.querySelector(selector);
                return e ? e.innerHTML.split(' - ')[1] : null;
            }, "ul.list-default > li:nth-child(" + i + ") div.list-item--meta > p.list-item--info");

            if (moment(data, "DD ** MMMM, YYYY") > moment().subtract(totalDaysToFetch, 'days')) {

                //Titulo
                let title = await page.evaluate((selector) => {
                    let e = document.querySelector(selector);
                    return e ? e.innerHTML : null;
                }, "ul.list-default > li:nth-child(" + i + ") div.list-item--meta > h2");

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

                //Imagem
                let image = "data:";
                while (image.includes('data:')) {
                    image = await page.evaluate((selector) => {
                        let e = document.querySelector(selector).getAttribute('src');
                        return e ? e : null;
                    }, "ul.list-default > li:nth-child(" + i + ") div.list-item--thumb > img");
                    await page.waitFor(500);
                }

                articlesFound.push({
                    imagem: image,
                    titulo: title,
                    data: data,
                    descricao: description,
                    url: url,
                    html: html
                });

                console.log("Article fetched.");
                console.log("Article date: " + data);
            }

            lastArticleDate = moment(data, "DD ** MMMM, YYYY");
            if (lastArticleDate < moment().subtract(totalDaysToFetch, 'days'))
                i = articlesOnPage;
        }

        pageNumber++;
    }

    console.log("Pages crawled: " + (pageNumber-1));
    console.log("Articles fetched: " + articlesFound.length);

    // console.log(articlesFound);
    fs.writeFileSync('./articles.json', JSON.stringify(articlesFound));
    console.log("Articles saved on file 'articles.json'");
    console.log("Total run time: " + moment.duration(moment().diff(startTime)).asSeconds() + " seconds.");

    await browser.close();

})();

  