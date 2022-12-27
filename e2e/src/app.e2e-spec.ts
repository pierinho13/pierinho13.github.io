import {BabylonPage} from './app.po';

describe('Babylon App', () => {
    let page: BabylonPage;

    beforeEach(() => {
        page = new BabylonPage();
    });

    it('should display welcome message', () => {
        page.navigateTo();
        expect(page.getTitleText()).toEqual('Welcome to Babylon!');
    });
});
