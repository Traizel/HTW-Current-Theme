import PageManager from './page-manager';
import jQuery from 'jquery';

export default class Page extends PageManager {
	constructor() {
		super();
		this.tabbedAccordion();
	}
	tabbedAccordion() {
		const accordion = document.querySelector('.page-content .collapsible');
		if (accordion) {
			accordion.addEventListener('click', e => {
				if (e.target.nodeName === 'A') {
					e.preventDefault();
					const parent = e.target.parentElement.parentElement;
					const collapseParent = parent.className.indexOf('expanded') > -1;
					Array.prototype.slice.call(accordion.querySelectorAll('.expanded')).forEach(element => {
						element.classList.remove('expanded');
					});
					if (!collapseParent) {
						e.target.parentElement.parentElement.classList.add('expanded');
					}
				}
			});
		}
	}
}
