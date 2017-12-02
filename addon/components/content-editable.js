import { isEmpty } from '@ember/utils';
import { htmlSafe } from '@ember/string';
import { once } from '@ember/runloop';
import Component from '@ember/component';

export default Component.extend({
  classNames: ['ember-content-editable'],
  classNameBindings: ['extraClass', 'clearPlaceholderOnFocus:clear-on-focus'],
  attributeBindings: [
    'contenteditable',
    'placeholder',
    'spellcheck',
    'tabindex',
    'readonly',
    'disabled'
  ],

  editable: null,
  disabled: null,
  spellcheck: null,
  isText: null,
  type: null,
  readonly: null,
  allowNewlines: true,
  autofocus: false,
  clearPlaceholderOnFocus: false,

  _observeValue: true,

  didReceiveAttrs() {
    this._super(...arguments);

    this.set('contenteditable', !this.get('disabled'));
    this.set('inputType', this.get('type') || 'html');

    if (this.get('_observeValue')) {
      this.setValue();
    }
  },

  didInsertElement() {
    this._super(...arguments);

    this.setValue();
    once(() => this._processInput());

    this.$().on('paste', (event) => {
      this.handlePaste(event, this);
    });

    if (this.get('autofocus')) {
      this.$().focus();
    }
  },

  willDestroyElement() {
    this._super(...arguments);

    this.$().off('paste');
  },

  setValue() {
    if (this.element) {
      this.$().text(this.get('value'));
    }
  },

  stringInterpolator(s) { return s; },

  _getInputValue() {
    if (this.get('inputType') === "html") {
      // Deocde html entities
      let val = this.$().html();
      val = this.$('<div/>').html(val).text();
      return val;
    } else {
      return this.element.innerText || this.element.textContent;
    }
  },

  _processInput() {
    let val = this._getInputValue();
    val = this.stringInterpolator(val);
    val = this.htmlSafe(val);

    this.set('_observeValue', false);
    this.set('value', val);
    this.set('_observeValue', true);
  },

  htmlSafe(val) {
    if (this.get('inputType') === "html") {
      return htmlSafe(val).toString();
    } else {
      return val;
    }
  },

  isUnderMaxLength(val) {
    return isEmpty(this.get('maxlength')) ||
    val.length < this.get('maxlength');
  },

  keyUp(event) {
    this._processInput();
    this.handleKeyUp(event);
  },

  handleKeyUp(event) {
    if (this.get('readonly')) {
      event.preventDefault();
      return false;
    }

    this.sendAction('key-up', this.get('value'), event);
  },
 insertTextAtCursor(text) {
    let sel, range;
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
            range = sel.getRangeAt(0);
            range.deleteContents();
            /** Paste text **/
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
            /** use the values of the updated range object to reset it start position **/
            range.setStart(range.endContainer,range.endOffset);
            /** collapse it to turn it into a single cursor **/
            range.collapse(true);
            /** remove everything **/
            sel.removeAllRanges();
            /** add our fresh range **/
            sel.addRange(range);
        }
    } else if (document.selection && document.selection.createRange) {
        document.selection.createRange().text = text;
    }
  },

  /* Events */
  handlePaste(event, _this) {
    let content = event.originalEvent.clipboardData.getData('text');
    const currentVal = _this._getInputValue();

    event.preventDefault();

    if (window.getSelection().rangeCount > 0) {
      //If in focus then allow paste
      let start = window.getSelection().getRangeAt(0).startOffset;
      let end = window.getSelection().getRangeAt(0).endOffset;

      let freeSpace = _this.get('maxlength') - currentVal.length + (end - start);
      if (_this.get('maxlength')) {
        //Truncate content if there is a maxlength and content is larger than it
        content = content.substring(0, freeSpace);
      }

      this.insertTextAtCursor(content);
    }

    let value = _this._getInputValue();
    this.set('_observeValue', false);

    if (!this.get('allowNewlines')) {
      value = value.toString().replace(/\n/g, ' ');
    }

    if (this.get('type') === 'number') {
      value = value.toString().replace(/[^0-9]/g, '');
    }

    this.set('value', value);
    this.set('_observeValue', true);
  },

  keyDown(event) {
    if (this.get('readonly')) {
      event.preventDefault();
      return false;
    }

    if (event.keyCode === 27) {
      // Escape
      this.sendAction('escape-press', this, event);
    } else if (event.keyCode === 13) {
      // Enter
      this.sendAction('enter', this, event);
      if (this.get('allowNewlines')) {
        this.sendAction('insert-newline', this, event);
      } else {
        event.preventDefault();
        return false;
      }
    }

    this.sendAction('key-down', this.get('value'), event);
  },

  keyPress(event) {
    if (this.get('readonly')) {
      event.preventDefault();
      return false;
    }

    let val = this._getInputValue();
    if (!this.isUnderMaxLength(val)) {
      // Check if text is selected (typing will replace)
      if (window.getSelection().rangeCount > 0) {
        let start = window.getSelection().getRangeAt(0).startOffset;
        let end = window.getSelection().getRangeAt(0).endOffset;
        if (start === end) {
          event.preventDefault();
        }
      } else {
        event.preventDefault();
      }
    }

    if (this.get('type') === 'number') {
      const key = event.which || event.keyCode;
      if (key < 48 || key >= 58) {
        event.preventDefault();
        return false;
      }
    }

    this.sendAction('key-press', this, event);
  },

  focusIn(event) {
    this.sendAction('focus-in', this, event);
  },

  focusOut(event) {
    this.sendAction('focus-out', this, event);
  },

  mouseEnter(event) {
    this.sendAction('mouse-enter', this, event);
  },

  mouseLeave(event) {
    this.sendAction('mouse-leave', this, event);
  },
});
