# jquery-frontend-kit
Set of tools for jQuery frontend development.

## Requirements
 - [jQuery v3.3.1](https://blog.jquery.com/2018/01/20/jquery-3-3-1-fixed-dependencies-in-release-tag/): *fast, small, and feature-rich JavaScript library.*
 - [cleave v1.6.0](https://cdnjs.com/libraries/cleave.js/1.6.0) : *JavaScript library for formatting input text content when you are typing.*
 - [jQuery loading-overlay v2.1.7](https://gasparesganga.com/labs/jquery-loading-overlay/): *A flexible loading overlay jQuery plugin.*
 - [jQuery confirm v3.3.4](https://craftpip.github.io/jquery-confirm/): *alerts, confirms and dialogs in one.*
 - [jQuery UI v1.12.1](https://blog.jqueryui.com/2016/09/jquery-ui-1-12-1/): *curated set of user interface interactions, effects, widgets, and themes built on top of the jQuery JavaScript Library.*
 - [Slimselect v1.27.0](https://slimselectjs.com/): *Advanced select dropdown.*
 - [Fontawesome](https://fontawesome.com/v5/docs/web/use-with/wordpress/install-manually): *set of icons for web apps.*

## class: click-one
Apply the class `click-one` when you want to stop propagation after clicking on an element. If you have 2 nested onclick, applying this class on the deepest element will prevent the parent element onclick event to get triggered.

## Display toggle
Apply the class `display-toggle` to the element that represent the toggle and add the **selector** of the container to display or hide based on the toggle, as the `data-container` attribute value.

### Example
```html
<div>
    <i class="display-toggle fa fa-eye" data-container="#secret-message-element"></i>
    <span id="secret-message-element">Secret message</span>
</div>
```

> The container selector must be an css selector.