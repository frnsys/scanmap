/*
 * Test that append log form
 * doesn't show up on invalid key.
 */

const assert = require('assert');
const { openBrowser, goto, click, prompt, accept, textBox, $, focus, write, press, text, button, closeBrowser } = require('taiko');
(async () => {
    let errorOccurred = false;
    try {
        await openBrowser();
        await goto('localhost:8800');
        await click('ny');
        await prompt('Key', async () => accept('WRONG'));
        await click('If you have a key, click here to start adding');
        assert.strictEqual(await text('Invalid key').exists(), true);
        assert.strictEqual(await $('#append').exists(), false);
    } catch (error) {
        console.error(error);
        errorOccurred = true;
    } finally {
        await closeBrowser();
    }
    process.exit(errorOccurred ? -1 : 0);
})();
