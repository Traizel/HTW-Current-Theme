import _ from 'lodash';
import collapsibleFactory from '../common/collapsible';
import collapsibleGroupFactory from '../common/collapsible-group';

const PLUGIN_KEY = 'menu';

/*
 * Manage the behaviour of a menu
 * @param {jQuery} $menu
 */
class Menu {
	constructor($menu) {
		this.header = document.querySelector('.header');
		this.$menu = $menu;
		this.$body = $('body');
		this.categoryItem = document.querySelector('.navPages-item.categories');
		this.categoryMenu = document.querySelector('#navCategories');
		this.hasMaxMenuDisplayDepth = this.$body.find('.navPages-list').hasClass('navPages-list-depth-max');
		this.onCategoryItemEnter = this.onCategoryItemEnter.bind(this);
		this.onCategoryMenuLeave = this.onCategoryMenuLeave.bind(this);

		// Init collapsible
		this.collapsibles = collapsibleFactory('[data-collapsible]', { $context: this.$menu });
		this.collapsibleGroups = collapsibleGroupFactory($menu);

		// Mobile header things
		this.lastYPosition = window.pageYOffset;

		// Auto-bind
		this.onMenuClick = this.onMenuClick.bind(this);
		this.onDocumentClick = this.onDocumentClick.bind(this);

		// Listen
		this.bindEvents();
		this.setNavActivePage();
	}

	setNavActivePage() {
		document.querySelector(`[href="${window.location.pathname}"]`);
		// FINISH LATER
	}

	collapseAll() {
		this.collapsibles.forEach(collapsible => collapsible.close());
		this.collapsibleGroups.forEach(group => group.close());
	}

	collapseNeighbors($neighbors) {
		const $collapsibles = collapsibleFactory('[data-collapsible]', { $context: $neighbors });

		$collapsibles.forEach($collapsible => $collapsible.close());
	}

	bindEvents() {
		this.$menu.on('click', this.onMenuClick);
		this.$body.on('click', this.onDocumentClick);
		// const _this = this;
		// this.categoryItem.addEventListener('mouseenter', e => {
		// 	_this.onCategoryItemEnter(e);
		// });
		// this.categoryItem.addEventListener('mouseleave', e => {
		// 	_this.onCategoryItemLeave(e);
		// });
		// this.categoryMenu.addEventListener('mouseleave', e => {
		// 	_this.onCategoryMenuLeave(e);
		// });
		// Array.prototype.slice.call(document.querySelectorAll('.navPage-subMenu-list.tier-1 > .navPage-subMenu-item')).forEach(el => {
		// 	el.addEventListener('mouseenter', e => {
		// 		if (el.querySelector('.navPage-subMenu-action.has-subMenu') !== null && el.className.indexOf('active') === -1) {
		// 			Array.prototype.slice.call(document.querySelectorAll('.navPage-subMenu-list.tier-1 > .active')).forEach(li => {
		// 				window.setTimeout(() => {
		// 					li.className = li.className.replace(/\s?active/g, '');
		// 				}, 200);
		// 			});
		// 			el.className += ' active';
		// 		}
		// 	});
		// });

		const mobileHeaderScroll = _.debounce(() => {
			const mobileMenuOpen = document.body.classList.contains('has-activeNavPages');
			const newYPosition = window.pageYOffset;
			const scrolledUp = newYPosition < this.lastYPosition - 50;
			this.lastYPosition = newYPosition;
			const headerIsHidden = this.header.classList.contains('header-scrolled-away');
			const withinTwoHeaderHeights = newYPosition < this.header.offsetHeight * 2;
			if (mobileMenuOpen || withinTwoHeaderHeights) {
				this.header.classList.remove('header-scrolled-away');
				return;
			}
			if (scrolledUp) {
				if (headerIsHidden) {
					this.header.classList.remove('header-scrolled-away');
				}
				return;
			}
			this.header.classList.add('header-scrolled-away');
		}, 200);
		window.addEventListener('scroll', mobileHeaderScroll);

		const $backToTop = $('#back-to-top');
		const backToTopVisible = _.debounce(() => {
			const offset = 300;
			const offsetOpacity = 1200;
			($(window).scrollTop() > offset) ? $backToTop.addClass('is-visible'): $backToTop.removeClass('is-visible fade-out');
			if ($(window).scrollTop() > offsetOpacity) {
				$backToTop.addClass('fade-out');
			}
		});
		window.addEventListener('scroll', backToTopVisible);
		const backToTopScroll = _.debounce((e) => { 
			e.preventDefault();
			$('body,html').animate({
				scrollTop: 0
			}, 700);
		});
		$backToTop.on('click', backToTopScroll);
	}

	unbindEvents() {
		this.$menu.off('click', this.onMenuClick);
		this.$body.off('click', this.onDocumentClick);
	}

	onCategoryItemEnter(event) {
		if (document.querySelector('.navPage-subMenu-list.tier-1 > .active') === null) {
			document.querySelector('.navPage-subMenu-list.tier-1 > .navPage-subMenu-item').className += ' active';
		}
		this.categoryItem.className  += ' is-open';
	}
	onCategoryItemLeave(event) {
		const rect = this.categoryItem.getBoundingClientRect();
		const eventX = event.clientX;
		const eventY = event.clientY;
		if ((eventX < rect.x || eventX > rect.x + rect.width) || eventY < rect.y) {
			this.categoryItem.className = this.categoryItem.className.replace(/\s?is-open/g, '');
		}
	}
	onCategoryMenuLeave(event) {
		this.categoryItem.className = this.categoryItem.className.replace(/\s?is-open/g, '');
		this.resetActiveCategory();
	}
	resetActiveCategory() {
		Array.prototype.slice.call(document.querySelectorAll('.navPage-subMenu-list.tier-1 > .active')).forEach(li => {
			window.setTimeout(() => {
				li.className = li.className.replace(/\s?active/g, '');
			}, 100);
		});
		document.querySelector('.navPage-subMenu-list.tier-1 > .navPage-subMenu-item').className += ' active';
	}

	onMenuClick(event) {
		event.stopPropagation();

		if (this.hasMaxMenuDisplayDepth) {
			const $neighbors = $(event.target).parent().siblings();

			this.collapseNeighbors($neighbors);
		}
	}

	onDocumentClick() {
		this.collapseAll();
	}

	
}

/*
 * Create a new Menu instance
 * @param {string} [selector]
 * @return {Menu}
 */
export default function menuFactory(selector = `[data-${PLUGIN_KEY}]`) {
	const $menu = $(selector).eq(0);
	const instanceKey = `${PLUGIN_KEY}Instance`;
	const cachedMenu = $menu.data(instanceKey);

	if (cachedMenu instanceof Menu) {
		return cachedMenu;
	}

	const menu = new Menu($menu);

	$menu.data(instanceKey, menu);

	return menu;
}
