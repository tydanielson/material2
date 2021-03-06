import {QueryList} from '@angular/core';
import {FocusKeyManager} from './focus-key-manager';
import {DOWN_ARROW, UP_ARROW, TAB, HOME, END} from '../keyboard/keycodes';
import {ListKeyManager} from './list-key-manager';
import {ActiveDescendantKeyManager} from './activedescendant-key-manager';

class FakeFocusable {
  disabled = false;
  focus() {}
}

class FakeHighlightable {
  disabled = false;
  setActiveStyles() {}
  setInactiveStyles() {}
}

class FakeQueryList<T> extends QueryList<T> {
  get length() { return this.items.length; }
  items: T[];
  toArray() {
    return this.items;
  }
}

export class FakeEvent {
  defaultPrevented: boolean = false;
  constructor(public keyCode: number) {}
  preventDefault() {
    this.defaultPrevented = true;
  }
}

describe('Key managers', () => {
  let itemList: FakeQueryList<any>;
  let DOWN_ARROW_EVENT: KeyboardEvent;
  let UP_ARROW_EVENT: KeyboardEvent;
  let TAB_EVENT: KeyboardEvent;
  let HOME_EVENT: KeyboardEvent;
  let END_EVENT: KeyboardEvent;

  beforeEach(() => {
    itemList = new FakeQueryList<any>();

    DOWN_ARROW_EVENT = new FakeEvent(DOWN_ARROW) as KeyboardEvent;
    UP_ARROW_EVENT = new FakeEvent(UP_ARROW) as KeyboardEvent;
    TAB_EVENT = new FakeEvent(TAB) as KeyboardEvent;
    HOME_EVENT = new FakeEvent(HOME) as KeyboardEvent;
    END_EVENT = new FakeEvent(END) as KeyboardEvent;

  });


  describe('ListKeyManager', () => {
    let keyManager: ListKeyManager<FakeFocusable>;

    beforeEach(() => {
      itemList.items = [
        new FakeFocusable(),
        new FakeFocusable(),
        new FakeFocusable()
      ];

      keyManager = new ListKeyManager<FakeFocusable>(itemList);

      // first item is already focused
      keyManager.setFirstItemActive();

      spyOn(keyManager, 'setActiveItem').and.callThrough();
    });

    describe('Key events', () => {

      it('should set subsequent items as active when down arrow is pressed', () => {
        keyManager.onKeydown(DOWN_ARROW_EVENT);

        expect(keyManager.activeItemIndex)
            .toBe(1, 'Expected active item to be 1 after 1 down arrow event.');
        expect(keyManager.setActiveItem).not.toHaveBeenCalledWith(0);
        expect(keyManager.setActiveItem).toHaveBeenCalledWith(1);
        expect(keyManager.setActiveItem).not.toHaveBeenCalledWith(2);

        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(2, 'Expected active item to be 2 after 2 down arrow events.');
        expect(keyManager.setActiveItem).toHaveBeenCalledWith(2);
        expect(keyManager.setActiveItem).not.toHaveBeenCalledWith(0);
      });

      it('should set previous items as active when up arrow is pressed', () => {
        keyManager.onKeydown(DOWN_ARROW_EVENT);

        expect(keyManager.activeItemIndex)
            .toBe(1, 'Expected active item to be 1 after 1 down arrow event.');
        expect(keyManager.setActiveItem).not.toHaveBeenCalledWith(0);
        expect(keyManager.setActiveItem).toHaveBeenCalledWith(1);

        keyManager.onKeydown(UP_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(0, 'Expected active item to be 0 after 1 down and 1 up arrow event.');
        expect(keyManager.setActiveItem).toHaveBeenCalledWith(0);
      });

      it('should skip disabled items using arrow keys', () => {
        itemList.items[1].disabled = true;

        // down arrow should skip past disabled item from 0 to 2
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(2, 'Expected active item to skip past disabled item on down arrow.');
        expect(keyManager.setActiveItem).not.toHaveBeenCalledWith(0);
        expect(keyManager.setActiveItem).not.toHaveBeenCalledWith(1);
        expect(keyManager.setActiveItem).toHaveBeenCalledWith(2);

        // up arrow should skip past disabled item from 2 to 0
        keyManager.onKeydown(UP_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(0, 'Expected active item to skip past disabled item on up arrow.');
        expect(keyManager.setActiveItem).toHaveBeenCalledWith(0);
        expect(keyManager.setActiveItem).not.toHaveBeenCalledWith(1);
      });

      it('should work normally when disabled property does not exist', () => {
        itemList.items[0].disabled = undefined;
        itemList.items[1].disabled = undefined;
        itemList.items[2].disabled = undefined;

        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(1, 'Expected active item to be 1 after 1 down arrow when disabled not set.');
        expect(keyManager.setActiveItem).not.toHaveBeenCalledWith(0);
        expect(keyManager.setActiveItem).toHaveBeenCalledWith(1);
        expect(keyManager.setActiveItem).not.toHaveBeenCalledWith(2);

        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(2, 'Expected active item to be 2 after 2 down arrows when disabled not set.');
        expect(keyManager.setActiveItem).not.toHaveBeenCalledWith(0);
        expect(keyManager.setActiveItem).toHaveBeenCalledWith(2);
      });

      it('should not move active item past either end of the list', () => {
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(2, `Expected last item of the list to be active.`);

        // this down arrow would move active item past the end of the list
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(2, `Expected active item to remain at the end of the list.`);

        keyManager.onKeydown(UP_ARROW_EVENT);
        keyManager.onKeydown(UP_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(0, `Expected first item of the list to be active.`);

        // this up arrow would move active item past the beginning of the list
        keyManager.onKeydown(UP_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(0, `Expected active item to remain at the beginning of the list.`);
      });

      it('should not move active item to end when the last item is disabled', () => {
        itemList.items[2].disabled = true;
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(1, `Expected second item of the list to be active.`);

        // this down arrow would set active item to the last item, which is disabled
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(1, `Expected the second item to remain active.`);
        expect(keyManager.setActiveItem).not.toHaveBeenCalledWith(2);
      });

      it('should set the active item to the first item when HOME is pressed', () => {
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(2, `Expected last item of the list to be active.`);

        keyManager.onKeydown(HOME_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(0, `Expected the HOME key to set the active item to the first item.`);
      });

      it('should set the active item to the last item when END is pressed', () => {
        expect(keyManager.activeItemIndex)
            .toBe(0, `Expected first item of the list to be active.`);

        keyManager.onKeydown(END_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(2, `Expected the END key to set the active item to the last item.`);
      });

      it('should emit tabOut when the tab key is pressed', () => {
        let tabOutEmitted = false;
        keyManager.tabOut.first().subscribe(() => tabOutEmitted = true);
        keyManager.onKeydown(TAB_EVENT);

        expect(tabOutEmitted).toBe(true);
      });

      it('should prevent the default keyboard action', () => {
        expect(DOWN_ARROW_EVENT.defaultPrevented).toBe(false);

        keyManager.onKeydown(DOWN_ARROW_EVENT);

        expect(DOWN_ARROW_EVENT.defaultPrevented).toBe(true);
      });

      it('should not prevent the default keyboard action when pressing tab', () => {
        expect(TAB_EVENT.defaultPrevented).toBe(false);

        keyManager.onKeydown(TAB_EVENT);

        expect(TAB_EVENT.defaultPrevented).toBe(false);
      });

    });

    describe('programmatic focus', () => {

      it('should setActiveItem()', () => {
        expect(keyManager.activeItemIndex)
            .toBe(0, `Expected first item of the list to be active.`);

        keyManager.setActiveItem(1);
        expect(keyManager.activeItemIndex)
            .toBe(1, `Expected activeItemIndex to be updated when setActiveItem() was called.`);
      });

      it('should expose the active item correctly', () => {
        keyManager.onKeydown(DOWN_ARROW_EVENT);

        expect(keyManager.activeItemIndex).toBe(1, 'Expected active item to be the second option.');
        expect(keyManager.activeItem)
            .toBe(itemList.items[1], 'Expected the active item to match the second option.');


        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex).toBe(2, 'Expected active item to be the third option.');
        expect(keyManager.activeItem)
            .toBe(itemList.items[2], 'Expected the active item ID to match the third option.');
      });

      it('should setFirstItemActive()', () => {
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(2, `Expected last item of the list to be active.`);

        keyManager.setFirstItemActive();
        expect(keyManager.activeItemIndex)
            .toBe(0, `Expected setFirstItemActive() to set the active item to the first item.`);
      });

      it('should set the active item to the second item if the first one is disabled', () => {
        itemList.items[0].disabled = true;

        keyManager.setFirstItemActive();
        expect(keyManager.activeItemIndex)
            .toBe(1, `Expected the second item to be active if the first was disabled.`);
      });

      it('should setLastItemActive()', () => {
        expect(keyManager.activeItemIndex)
            .toBe(0, `Expected first item of the list to be active.`);

        keyManager.setLastItemActive();
        expect(keyManager.activeItemIndex)
            .toBe(2, `Expected setLastItemActive() to set the active item to the last item.`);
      });

      it('should set the active item to the second to last item if the last is disabled', () => {
        itemList.items[2].disabled = true;

        keyManager.setLastItemActive();
        expect(keyManager.activeItemIndex)
            .toBe(1, `Expected the second to last item to be active if the last was disabled.`);
      });

      it('should setNextItemActive()', () => {
        expect(keyManager.activeItemIndex)
            .toBe(0, `Expected first item of the list to be active.`);

        keyManager.setNextItemActive();
        expect(keyManager.activeItemIndex)
            .toBe(1, `Expected setNextItemActive() to set the active item to the next item.`);
      });

      it('should set the active item to the next enabled item if next is disabled', () => {
        itemList.items[1].disabled = true;
        expect(keyManager.activeItemIndex)
            .toBe(0, `Expected first item of the list to be active.`);

        keyManager.setNextItemActive();
        expect(keyManager.activeItemIndex)
            .toBe(2, `Expected setNextItemActive() to only set enabled items as active.`);
      });

      it('should setPreviousItemActive()', () => {
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(1, `Expected second item of the list to be active.`);

        keyManager.setPreviousItemActive();
        expect(keyManager.activeItemIndex)
            .toBe(0, `Expected setPreviousItemActive() to set the active item to the previous.`);
      });

      it('should skip disabled items when setPreviousItemActive() is called', () => {
        itemList.items[1].disabled = true;
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex)
            .toBe(2, `Expected third item of the list to be active.`);

        keyManager.setPreviousItemActive();
        expect(keyManager.activeItemIndex)
            .toBe(0, `Expected setPreviousItemActive() to skip the disabled item.`);
      });

    });

    describe('wrap mode', () => {

      it('should return itself to allow chaining', () => {
        expect(keyManager.withWrap())
            .toEqual(keyManager, `Expected withWrap() to return an instance of ListKeyManager.`);
      });

      it('should wrap focus when arrow keying past items while in wrap mode', () => {
        keyManager.withWrap();
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        keyManager.onKeydown(DOWN_ARROW_EVENT);

        expect(keyManager.activeItemIndex).toBe(2, 'Expected last item to be active.');

        // this down arrow moves down past the end of the list
        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(keyManager.activeItemIndex).toBe(0, 'Expected active item to wrap to beginning.');

        // this up arrow moves up past the beginning of the list
        keyManager.onKeydown(UP_ARROW_EVENT);
        expect(keyManager.activeItemIndex).toBe(2, 'Expected active item to wrap to end.');
      });

    });

  });

  describe('FocusKeyManager', () => {
    let keyManager: FocusKeyManager;

    beforeEach(() => {
      itemList.items = [
        new FakeFocusable(),
        new FakeFocusable(),
        new FakeFocusable()
      ];

      keyManager = new FocusKeyManager(itemList);

      // first item is already focused
      keyManager.setFirstItemActive();

      spyOn(itemList.items[0], 'focus');
      spyOn(itemList.items[1], 'focus');
      spyOn(itemList.items[2], 'focus');
    });

      it('should focus subsequent items when down arrow is pressed', () => {
        keyManager.onKeydown(DOWN_ARROW_EVENT);

        expect(itemList.items[0].focus).not.toHaveBeenCalled();
        expect(itemList.items[1].focus).toHaveBeenCalledTimes(1);
        expect(itemList.items[2].focus).not.toHaveBeenCalled();

        keyManager.onKeydown(DOWN_ARROW_EVENT);
        expect(itemList.items[0].focus).not.toHaveBeenCalled();
        expect(itemList.items[1].focus).toHaveBeenCalledTimes(1);
        expect(itemList.items[2].focus).toHaveBeenCalledTimes(1);
      });

      it('should focus previous items when up arrow is pressed', () => {
        keyManager.onKeydown(DOWN_ARROW_EVENT);

        expect(itemList.items[0].focus).not.toHaveBeenCalled();
        expect(itemList.items[1].focus).toHaveBeenCalledTimes(1);

        keyManager.onKeydown(UP_ARROW_EVENT);

        expect(itemList.items[0].focus).toHaveBeenCalledTimes(1);
        expect(itemList.items[1].focus).toHaveBeenCalledTimes(1);
      });

      it('should allow setting the focused item without calling focus', () => {
        expect(keyManager.activeItemIndex)
            .toBe(0, `Expected first item of the list to be active.`);

        keyManager.updateActiveItemIndex(1);
        expect(keyManager.activeItemIndex)
            .toBe(1, `Expected activeItemIndex to update after calling updateActiveItemIndex().`);
        expect(itemList.items[1].focus).not.toHaveBeenCalledTimes(1);
      });

  });

  describe('ActiveDescendantKeyManager', () => {
    let keyManager: ActiveDescendantKeyManager;

    beforeEach(() => {
      itemList.items = [
        new FakeHighlightable(),
        new FakeHighlightable(),
        new FakeHighlightable()
      ];

      keyManager = new ActiveDescendantKeyManager(itemList);

      // first item is already focused
      keyManager.setFirstItemActive();

      spyOn(itemList.items[0], 'setActiveStyles');
      spyOn(itemList.items[1], 'setActiveStyles');
      spyOn(itemList.items[2], 'setActiveStyles');

      spyOn(itemList.items[0], 'setInactiveStyles');
      spyOn(itemList.items[1], 'setInactiveStyles');
      spyOn(itemList.items[2], 'setInactiveStyles');
    });

    it('should set subsequent items as active with the DOWN arrow', () => {
      keyManager.onKeydown(DOWN_ARROW_EVENT);

      expect(itemList.items[1].setActiveStyles).toHaveBeenCalled();
      expect(itemList.items[2].setActiveStyles).not.toHaveBeenCalled();

      keyManager.onKeydown(DOWN_ARROW_EVENT);
      expect(itemList.items[2].setActiveStyles).toHaveBeenCalled();
    });

    it('should set previous items as active with the UP arrow', () => {
      keyManager.setLastItemActive();

      keyManager.onKeydown(UP_ARROW_EVENT);
      expect(itemList.items[1].setActiveStyles).toHaveBeenCalled();
      expect(itemList.items[0].setActiveStyles).not.toHaveBeenCalled();

      keyManager.onKeydown(UP_ARROW_EVENT);
      expect(itemList.items[0].setActiveStyles).toHaveBeenCalled();
    });

    it('should set inactive styles on previously active items', () => {
      keyManager.onKeydown(DOWN_ARROW_EVENT);
      expect(itemList.items[0].setInactiveStyles).toHaveBeenCalled();

      keyManager.onKeydown(UP_ARROW_EVENT);
      expect(itemList.items[1].setInactiveStyles).toHaveBeenCalled();
    });

  });


});
