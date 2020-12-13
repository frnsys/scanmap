/*
 * Test core append log/annotation functionality.
 * Tests cover:
 *  - location search gets coordinates
 *  - logs are added to the feed
 *  - logs are added to the map as markers
 *  - logs are added to map marker popups
 *  - log editing
 *  - log deletion
 *  - multiple logs at the same location
 */

const assert = require('assert');
const { openBrowser, goto, doubleClick, click, prompt, confirm, accept, textBox, $, focus, write, press, text, button, closeBrowser, within, dropDown, mouseAction } = require('taiko');

(async () => {
  let errorOccurred = false;
  try {
    await openBrowser();
    await goto('localhost:8800');
    await click('NY');

    // Assert no barricade marker yet
    assert.strictEqual(await text('🚧', within($('#map'))).exists(), false);

    await prompt('Key', async () => accept('WRITE'));
    await click('If you have a key, click here to start adding');
    await click('Got it');

    // Annotation
    await focus($('#text'));
    await write('police are here');

    // Location
    await focus($('#location'));
    await write('barclays center');
    await press('Enter');

    // Check that search results worked
    assert.strictEqual(await text('Barclays Center (40.6826,-73.9754)').exists(), true);
    assert.strictEqual(await text('40.6826465,-73.97541559999999', within($('#coordinates'))).exists(), true);

    // Label
    await dropDown({id: 'label'}).select('🚧 barricade');

    // Map
    await click($('#map'));
    await click(button({ id: 'submit' }));

    // Assert in feed list
    assert.strictEqual(await text('police are here', within($('#log'))).exists(), true);
    assert.strictEqual(await text('barclays center', within($('#log'))).exists(), true);
    assert.strictEqual(await text('🚧 barricade @ ', within($('#log'))).exists(), true);

    // Assert that marker was created
    // TODO how to test marker was placed in correct location?
    assert.strictEqual(await text('🚧', within($('#map'))).exists(), true);

    // Click marker for popup
    await click('🚧', within($('#map')));
    assert.strictEqual(await text('🚧 barricade', within($('#map'))).exists(), true);
    assert.strictEqual(await text('barclays center', within($('#map'))).exists(), true);
    assert.strictEqual(await text('police are here', within($('#map'))).exists(), true);
    await click($('.mapboxgl-popup-close-button'));

    // Editing log
    // Edit the label
    await doubleClick($('#log .logitem-label'));
    await dropDown(within($('#log .logitem-label-input'))).select('🚩 group');

    // Feed label should have changed
    assert.strictEqual(await text('🚩 group @ ', within($('#log'))).exists(), true);
    // Marker icon should have changed
    assert.strictEqual(await text('🚩', within($('#map'))).exists(), true);

    // Edit the location
    await doubleClick($('#log .logitem-location'));
    await clear($('.logitem-location-input'));
    await focus($('.logitem-location-input'));
    await write('grand army plaza');
    await press('Enter');

    // TODO change marker position
    // 40.6826465,-73.97541559999999

    // Feed location should have changed
    assert.strictEqual(await text('grand army plaza', within($('#log'))).exists(), true);

    // Edit the annotation
    await doubleClick($('#log .logitem-text'));
    await clear($('.logitem-text-input'));
    await focus($('.logitem-text-input'));
    await write('group is here');
    await press('Enter');

    // Feed annotation should have changed
    assert.strictEqual(await text('group is here', within($('#log'))).exists(), true);

    // Click elsewhere on map so we aren't
    // blocking the log marker with the form's preview marker
    await mouseAction($('#map'), 'press', {x:10, y:10});
    await mouseAction($('#map'), 'release', {x:10, y:10});

    // Click marker for popup
    await click('🚩', within($('#map')));
    assert.strictEqual(await text('🚩 group', within($('#map'))).exists(), true);
    assert.strictEqual(await text('grand army plaza', within($('#map'))).exists(), true);
    assert.strictEqual(await text('group is here', within($('#map'))).exists(), true);

    // Add a second log
    await focus($('#text'));
    await write('aviation spotted');
    await focus($('#location'));
    await write('barclays center'); // Create at same location as previous log
    await press('Enter');
    await dropDown({id: 'label'}).select('🚁 aviation');
    await click($('#map'));
    await click(button({ id: 'submit' }));

    // Assert in feed list
    assert.strictEqual(await text('aviation spotted', within($('#log'))).exists(), true);
    assert.strictEqual(await text('barclays center', within($('#log'))).exists(), true);
    assert.strictEqual(await text('🚁 aviation @ ', within($('#log'))).exists(), true);

    // Assert that the old marker was replaced by the new one,
    // since they're at the same location
    assert.strictEqual(await text('🚩', within($('#map'))).exists(), false);
    assert.strictEqual(await text('🚁', within($('#map'))).exists(), true);

    // Click marker for popup
    await click('🚁', within($('#map')));

    // Info for both logs should be there
    assert.strictEqual(await text('🚩 group', within($('#map'))).exists(), true);
    assert.strictEqual(await text('grand army plaza', within($('#map'))).exists(), true);
    assert.strictEqual(await text('group is here', within($('#map'))).exists(), true);
    assert.strictEqual(await text('🚁 aviation', within($('#map'))).exists(), true);
    assert.strictEqual(await text('barclays center', within($('#map'))).exists(), true);
    assert.strictEqual(await text('aviation spotted', within($('#map'))).exists(), true);

    // Delete the new log
    await confirm('Are you sure you want to delete this?', async () => await accept());
    await click($('.delete-log'), within($('#log')));

    // Assert no longer in feed list
    assert.strictEqual(await text('aviation spotted', within($('#log'))).exists(), false);
    assert.strictEqual(await text('barclays center', within($('#log'))).exists(), false);
    assert.strictEqual(await text('🚁 aviation @ ', within($('#log'))).exists(), false);

    // Assert that marker icon changed back to old one
    // since they're at the same location
    assert.strictEqual(await text('🚁', within($('#map'))).exists(), false);
    assert.strictEqual(await text('🚩', within($('#map'))).exists(), true);

    // Assert only the old log is in the popup
    assert.strictEqual(await text('🚩 group', within($('#map'))).exists(), true);
    assert.strictEqual(await text('grand army plaza', within($('#map'))).exists(), true);
    assert.strictEqual(await text('group is here', within($('#map'))).exists(), true);
    assert.strictEqual(await text('🚁 aviation', within($('#map'))).exists(), false);
    assert.strictEqual(await text('barclays center', within($('#map'))).exists(), false);
    assert.strictEqual(await text('aviation spotted', within($('#map'))).exists(), false);

    // Delete the old log
    await confirm('Are you sure you want to delete this?', async () => await accept());
    await click($('.delete-log'), within($('#log')));

    // Assert no longer in feed list
    assert.strictEqual(await text('group is here', within($('#log'))).exists(), false);
    assert.strictEqual(await text('grand army plaza', within($('#log'))).exists(), false);
    assert.strictEqual(await text('🚩 group @ ', within($('#log'))).exists(), false);

    // Assert marker gone
    assert.strictEqual(await text('🚩', within($('#map'))).exists(), false);

    // Assert popup gone
    assert.strictEqual(await text('🚩 group', within($('#map'))).exists(), false);
    assert.strictEqual(await text('grand army plaza', within($('#map'))).exists(), false);
    assert.strictEqual(await text('group is here', within($('#map'))).exists(), false);
  } catch (error) {
    console.error(error);
    errorOccurred = true;
  } finally {
    await closeBrowser();
  }
  process.exit(errorOccurred ? -1 : 0);
})();
