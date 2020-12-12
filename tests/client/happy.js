const assert = require('assert');
const { openBrowser, goto, click, prompt, accept, textBox, $, focus, write, press, text, button, closeBrowser } = require('taiko');
(async () => {
    let errorOccurred = false;
    try {
        await openBrowser();
        await goto('localhost:8800');
        await click('NY');
        await prompt('Key', async () => accept('WRITE'));
        await click('If you have a key, click here to start adding');
        await click('Got it');
        await focus($('#text'));
        await write('police are here');
        await focus($('#location'));
        await write('barclays center');
        await press('Enter');
        await text('Barclays Center');
        assert.strictEqual(await text('Barclays Center').exists(), true);
        await click(button({ id: 'submit' }));
        assert.strictEqual(await text('police are here').exists(), true);
    } catch (error) {
        console.error(error);
        errorOccurred = true;
    } finally {
        await closeBrowser();
    }
    process.exit(errorOccurred ? -1 : 0);
})();
