import PageManager from './page-manager';
import jQuery from 'jquery';
import { fetchProductSwatches } from './custom/product-helpers';

export default class Home extends PageManager {
	constructor(context) {
		super();
		if (window.location.pathname === '/') {
			this.customerRecentPurchases();
			const productIds = Array.prototype.slice.call(document.querySelectorAll('.card')).map(el => (parseInt(el.getAttribute('data-entity-id')))).filter(id => (id))
			console.log(productIds);
			fetchProductSwatches(productIds);
		}
	}
	parseHTML(str) {
		const tmp = document.implementation.createHTMLDocument();
		tmp.body.innerHTML = str;
		return tmp;
	}
	extractProductInfo(el) {
		const card = el.querySelector('.card');
		if (card !== null) {
			return {
				name: card.getAttribute('data-name') !== undefined ? card.getAttribute('data-name') : '',
				id: card.getAttribute('data-entity-id') !== undefined ? parseInt( card.getAttribute('data-entity-id'), 10): 0,
				brand: card.getAttribute('data-name') !== undefined ? card.getAttribute('data-name') : '',
				price: card.getAttribute('data-product-price') !== undefined ? parseInt( card.getAttribute('data-product-price'), 10): 0,
				link: card.querySelector('.card-title a') !== undefined ? card.querySelector('.card-title a').href : '',
				img: card.querySelector('.card-image') !== undefined ? card.querySelector('.card-image').getAttribute('data-src') : '',
				category: card.getAttribute('data-category') !== undefined ? card.getAttribute('data-product-category') : ''
			};
		} else {
			return {};
		}
	}
	customerRecentPurchases() {
		const customerRow = document.querySelector('[data-buy-it-again]');
		if (customerRow === null) {
			return false;
		}
		const customerId = parseInt(customerRow.getAttribute('data-customer-id'));
		if (!isNaN(customerId)) {
			this.fetchCustomerProducts(customerId);
		}
	}
	fetchCustomerProducts(id) {
		const productList = JSON.parse(localStorage.getItem(`__htw_customer_${id}_products`)) || [];
		const productListExpires = JSON.parse(localStorage.getItem(`__htw_customer_${id}_products_expires`));
		if (productListExpires === null || productListExpires < Date.now()) {
			this.clearLocalData(`__htw_customer_${id}_products`);
			this.ajaxFetchCustomerProducts(id);
			return false;
		}
		if (productList.length > 0) {
			this.populateRowWithProducts(productList);
			return false;
		}
		this.removeCustomerRow();
	}
	ajaxFetchCustomerProducts(id) {
		const _this = this;
		const url = `https://api.heattransferwarehouse.com/htw/customers/${id}/products`;
		jQuery.ajax({
			url: url,
			method: 'GET',
			success: function(data) {
				const products = data.filter(p => {
					const priceFloat = parseFloat(p['price']);
					const basePriceFloat = parseFloat(p['base_price']);
					const priceNotZero = !isNaN(priceFloat) && priceFloat > 0;
					const basePriceNotZero = !isNaN(basePriceFloat) && basePriceFloat > 0;
					return basePriceNotZero && priceNotZero;
				});
				// create temporary document from category page HTML
				if (data.length === 0) {
					_this.removeCustomerRow();
				}
				_this.saveLocalData(`__htw_customer_${id}_products`, products);
				_this.populateRowWithProducts(products);
			},
			error: function(xhr, status, err) {
				console.log(xhr);
				console.log(status);
				console.log(err);
				_this.saveLocalData(`__htw_customer_${id}_products`, []);
			}
		});
	}
	saveLocalData(key, data) {
		localStorage.setItem(key, JSON.stringify(data));
		localStorage.setItem(`${key}_expires`, Date.now() + 86400000);
	}
	clearLocalData(key) {
		localStorage.removeItem(key);
		localStorage.removeItem(`${key}_expires`);
	}
	populateRowWithProducts(products) {
		this.clearCustomerProducts();
		const customerProductsCarousel = this.setupCustomerProductsCarousel();
		if (customerProductsCarousel) {
			products.forEach(p => {
				customerProductsCarousel.appendChild(this.buildCarouselElement(p));
			}, this);
			this.triggerCustomerProductCarousel(customerProductsCarousel);
		}
	}
	clearCustomerProducts() {
		const customerRow = document.querySelector('[data-buy-it-again]');
		if (customerRow !== null) {
			customerRow.children.forEach(child => {
				if (child.className.indexOf('section-title') === -1) {
					customerRow.removeChild(child);
				}
			});
		}
	}
	setupCustomerProductsCarousel() {
		const customerRow = document.querySelector('[data-buy-it-again]');
		if (customerRow !== null) {
			const carousel = document.createElement('div');
			carousel.className = 'productCarousel';
			customerRow.appendChild(carousel);
			return carousel;
		}
		return false;
	}
	buildCarouselElement(productJson) {
		const productOptions = this.productCardOptions(productJson);
		console.log(productJson);
		const product = document.createElement('div');
		product.className = 'productCarousel-slide';
		const customUrlWithAttributes = this.appendAttributesToCustomUrl(productJson);
		product.innerHTML = `<article class="card"><figure class="card-figure"><a href="${customUrlWithAttributes || '#'}" tabindex="0"><div class="card-img-container"><img class="card-image lazyload" data-sizes="auto" src="${productJson.img}" data-src="${productJson.img}" alt="${productJson.name}" title="${productJson.name}" sizes="275px"><div class="shine"></div></div></a></figure><div class="card-body"><h4 class="card-title"><a href="${customUrlWithAttributes || '#'}" tabindex="0">${productJson.name}</a></h4><div class="card-text" data-test-info-type="price"><div class="price-section price-section--withoutTax"><span data-product-price-without-tax="" class="price price--withoutTax">$${parseFloat(productJson.price).toFixed(2)}</span></div><div class="product-options">${productOptions}</div></div></div></article>`;
		return product;
	}
	productCardOptions(productJson) {
		if (productJson.product_options === undefined) {
			return '';
		}
		return productJson.product_options.sort((a, b) => {
			if (a.display_name > b.display_name) {
				return -1;
			}
			if (a.display_name < b.display_name) {
				return 1;
			}
			return 0;
		}).map(o => (`<span product-option-name="${o.display_name}" class="product-option-value">${o.display_value}</span>`)).join('');
	}
	appendAttributesToCustomUrl(productJson) {
		const noProductOptions = productJson.product_options === undefined || productJson.product_options.length === 0;
		if (noProductOptions) {
			return productJson.custom_url;
		}
		const attributeValues = productJson.product_options.map(o => o.value).join(',');
		return `${productJson.custom_url}?attributes=${attributeValues}`;
	}
	triggerCustomerProductCarousel(customerProductsCarousel) {
		document.querySelector('[data-buy-it-again]').style.display = '';
		jQuery(customerProductsCarousel).slick({
			dots: false,
			infinite: true,
			mobileFirst: true,
			slidesToShow: 1,
			slidesToScroll: 1,
			responsive: [
				{
					breakpoint: 1260,
					settings: {
						slidesToScroll: 1,
						slidesToShow: 4,
					}
				},
				{
					breakpoint: 801,
					settings: {
						slidesToScroll: 1,
						slidesToShow: 4,
					}
				},
				{
					breakpoint: 551,
					settings: {
						slidesToScroll: 1,
						slidesToShow: 3
					}
				},
				{
					breakpoint: 479,
					settings: {
						slidesToScroll: 1,
						slidesToShow: 2
					}
				},
			]
		});
	}
	removeCustomerRow() {
		const customerRow = document.querySelector('[data-buy-it-again]');
		if (customerRow) {
			customerRow.parentElement.removeChild(customerRow);
		}
	}
}
