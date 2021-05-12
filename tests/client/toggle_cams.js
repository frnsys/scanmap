const assert = require('assert');
const { openBrowser, goto, click, $, closeBrowser } = require('taiko');
(async () => {
    let errorOccurred = false;
    try {
        await openBrowser();
        await goto('localhost:8800');
        assert.strictEqual(await $('.marker-camera').exists(), false);
        await click('ny');
        await click('Traffic cams');
        assert.strictEqual(await $('.marker-camera').exists(), true);
    } catch (error) {
        console.error(error);
        errorOccurred = true;
    } finally {
        await closeBrowser();
    }
    process.exit(errorOccurred ? -1 : 0);
})();
