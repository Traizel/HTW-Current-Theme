import _ from 'lodash';
import mediaQueryListFactory from '../common/media-query-list';

const PLUGIN_KEY = {
	CAMEL: 'mobileMenuToggle',
	SNAKE: 'mobile-menu-toggle',
};

function optionsFromData($element) {
	const mobileMenuId = $element.data(PLUGIN_KEY.CAMEL);

	return {
		menuSelector: mobileMenuId && `#${mobileMenuId}`,
	};
}

/*
 * Manage the behaviour of a mobile menu
 * @param {jQuery} $toggle
 * @param {Object} [options]
 * @param {Object} [options.headerSelector]
 * @param {Object} [options.menuSelector]
 * @param {Object} [options.scrollViewSelector]
 */
export class MobileMenuToggle {
	constructor($toggle, {
		headerSelector = '.header',
		menuSelector = '#menu',
		scrollViewSelector = '.navPages.mobile-menu',
	} = {}) {
		this.$body = $('body');
		this.$menu = $(menuSelector);
		this.$navList = $('.mobile-menu .navPages-list');
		this.$scrollView = $(scrollViewSelector, this.$menu);
		this.$toggle = $toggle;
		this.mediumMediaQueryList = mediaQueryListFactory('medium');
		this.level = 0;
		this.generateTier3Links();

		// Auto-bind
		this.onToggleClick = this.onToggleClick.bind(this);
		this.onCartPreviewOpen = this.onCartPreviewOpen.bind(this);
		this.onMediumMediaQueryMatch = this.onMediumMediaQueryMatch.bind(this);
		this.onSubMenuClick = this.onSubMenuClick.bind(this);
		this.onBackClick = this.onBackClick.bind(this);
		this.show = this.show.bind(this);
		this.hide = this.hide.bind(this);

		// Listen
		this.bindEvents();

		// Assign DOM attributes
		this.$toggle.attr('aria-controls', this.$menu.attr('id'));

		// Hide by default
		this.hide();
	}

	get isOpen() {
		// return this.$menu.hasClass('is-open');
		return this.$body.hasClass('has-activeNavPages');
	}

	bindEvents() {
		this.$toggle.on('click', this.onToggleClick);
		this.$navList.on('click .navPages-action', this.onSubMenuClick);
		// this.$navList.on('click .navPages-action.back', this.onBackClick);
		$('.off-canvas-overlay').eq(0).on('click', this.hide);

		if (this.mediumMediaQueryList && this.mediumMediaQueryList.addListener) {
			this.mediumMediaQueryList.addListener(this.onMediumMediaQueryMatch);
		}
	}

	unbindEvents() {
		this.$toggle.off('click', this.onToggleClick);
		if (this.mediumMediaQueryList && this.mediumMediaQueryList.addListener) {
			this.mediumMediaQueryList.removeListener(this.onMediumMediaQueryMatch);
		}
	}

	toggle() {
		if (this.isOpen) {
			this.hide();
		} else {
			this.show();
		}
	}

	show() {
		// this.$html.addClass('has-activeNavPages');
		this.$body.addClass('has-activeNavPages');
		this.$toggle
			.addClass('is-open')
			.attr('aria-expanded', true);
		this.$menu
			.addClass('is-open')
			.attr('aria-hidden', false);
		this.$scrollView.scrollTop(0);

		this.resetSubMenus();

		if (document.querySelector('.page[data-category-id]') !== null) {
			const id = parseInt(document.querySelector('.page[data-category-id]').getAttribute('data-category-id'), 10);
			const menuItem = document.querySelector(`.mobile-menu [data-category-id="${id}"]`);
			const mockEvent = {};
			if (menuItem.className.indexOf('has-subMenu') > -1) {
				mockEvent.target = menuItem;
			} else {
				mockEvent.target = menuItem.parentElement.parentElement.parentElement.parentElement.querySelector('.has-subMenu');
			}
			this.onSubMenuClick(mockEvent);
		}
	}

	hide() {
		// this.$html.removeClass('has-activeNavPages');
		this.$body.removeClass('has-activeNavPages');
		this.$toggle
			.removeClass('is-open')
			.attr('aria-expanded', false);
		this.$menu
			.removeClass('is-open')
			.attr('aria-hidden', true);
		this.resetSubMenus();
	}

	// Private
	onToggleClick(event) {
		event.preventDefault();
		this.toggle();
	}

	onCartPreviewOpen() {
		if (this.isOpen) {
			this.hide();
		}
	}

	onMediumMediaQueryMatch(media) {
		if (!media.matches) {
			return;
		}
		this.hide();
	}

	onSubMenuClick(event) {
		event.preventDefault();
		let target = event.target;
		const navPages = document.querySelector('.mobile-menu .navPages-list');
		if (event.target.nodeName.toLowerCase() === 'i') {
			target = event.target.parentElement;
		} else if (event.target.nodeName.toLowerCase() === 'svg') {
			target = event.target.parentElement.parentElement;
		} else if (event.target.nodeName.toLowerCase() === 'use') {
			target = event.target.parentElement.parentElement.parentElement;
		}
		if (document.querySelector('.has-subMenu.is-open + .navPage-subMenu') !== null) {
			document.querySelector('.has-subMenu.is-open + .navPage-subMenu').scrollTo(0, 0);
		}
		if (target.href !== undefined && target.href.indexOf('javascript') === -1) {
			window.location.href = target.href;
			return;
		}
		if (target.parentElement.className.indexOf('back') > -1) {
			this.onBackClick();
			navPages.setAttribute('data-level', parseInt(navPages.getAttribute('data-level'), 10) - 1);
		} else {
			navPages.setAttribute('data-level', parseInt(navPages.getAttribute('data-level'), 10) + 1);
			target.className += ' is-open';
		}
		document.querySelector('.navPages.mobile-menu').scrollTo(0, 0);
		Array.prototype.slice.call(document.querySelectorAll('.navPages.mobile-menu .navPages-list .navPage-subMenu')).forEach(el => {
			el.scrollTo(0, 0);
		});
		// const $closestAction = $(event.target).closest('.navPages-action');
		// const $parentSiblings = $closestAction.parent().siblings();
		// const $parentAction = $closestAction.closest('.navPage-subMenu').siblings('.navPages-action');
		// const parentLink = event.target.parentElement.previousElementSibling;

		// if ($closestAction.length > 0 && $closestAction[0].className.indexOf('back') > -1) {
		// 	// this.$subMenus.removeClass('is-open');
		// 	if (parentLink.className.indexOf('is-open') > -1) {
		// 		parentLink.className = parentLink.className.replace('is-open', '');
		// 	} else {
		// 		this.$navList.removeClass('subMenu-is-open');
		// 	}
		// 	$parentSiblings.removeClass('is-hidden');
		// 	$parentAction.removeClass('is-hidden');
		// } else {
		// 	$closestAction.addClass('is-open');
		// 	this.$navList.addClass('subMenu-is-open');
		// 	// if (this.$subMenus.hasClass('is-open')) {
		// 	// 	this.$navList.addClass('subMenu-is-open');
		// 	// } else {
		// 	// 	this.$navList.removeClass('subMenu-is-open');
		// 	// }

		// 	if ($(event.target).hasClass('is-open')) {
		// 		$parentSiblings.addClass('is-hidden');
		// 		$parentAction.addClass('is-hidden');
		// 	} else {
		// 		$parentSiblings.removeClass('is-hidden');
		// 		$parentAction.removeClass('is-hidden');
		// 	}
		// }
	}
	onBackClick() {
		const opens = Array.prototype.slice.call(document.querySelectorAll('.mobile-menu .is-open'));
		if (opens.length > 0) {
			opens[opens.length - 1].className = opens[opens.length - 1].className.replace(/is-open/g, '');
		}
	}

	resetSubMenus() {
		this.$navList.find('.is-hidden').removeClass('is-hidden');
		this.$navList.removeClass('subMenu-is-open');
		Array.prototype.slice.call(document.querySelectorAll('.mobile-menu .is-open')).forEach(el => {
			const elem = el;
			elem.className = elem.className.replace(/is-open/g, '');
		});
	}

	generateTier3Links() {
		Array.prototype.slice.call(document.querySelectorAll('.mobile-menu .has-childList')).forEach(el => {
			const a = el.cloneNode(true);
			a.textContent = `All ${a.textContent}`;
			a.className = 'navPage-childList-action navPages-action';
			const li = document.createElement('li');
			li.className = 'navPage-childList-item';
			li.appendChild(a);
			const tier3 = el.parentElement.querySelector('.tier-3');
			if (tier3) {
				el.href = 'javascript:void(0)';
				const backLink = tier3.querySelector('.back');
				if (backLink) {
					backLink.insertAdjacentElement('afterend', li);
					return;
				}
				tier3.insertAdjacentElement('afterbegin', li);
			}
		});
	}
}

/*
 * Create a new MobileMenuToggle instance
 * @param {string} [selector]
 * @param {Object} [options]
 * @param {Object} [options.headerSelector]
 * @param {Object} [options.menuSelector]
 * @param {Object} [options.scrollViewSelector]
 * @return {MobileMenuToggle}
 */
export default function mobileMenuToggleFactory(selector = `[data-${PLUGIN_KEY.SNAKE}]`, overrideOptions = {}) {
	const $toggle = $(selector).eq(0);
	const instanceKey = `${PLUGIN_KEY.CAMEL}Instance`;
	const cachedMobileMenu = $toggle.data(instanceKey);

	if (cachedMobileMenu instanceof MobileMenuToggle) {
		return cachedMobileMenu;
	}

	const options = _.extend(optionsFromData($toggle), overrideOptions);
	const mobileMenu = new MobileMenuToggle($toggle, options);

	$toggle.data(instanceKey, mobileMenu);

	return mobileMenu;
}
