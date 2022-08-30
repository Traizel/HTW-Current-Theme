import utils from '@bigcommerce/stencil-utils';
import 'foundation-sites/js/foundation/foundation';
import 'foundation-sites/js/foundation/foundation.reveal';
import ImageGallery from '../product/image-gallery';
import modalFactory, { showAlertModal, modalTypes } from '../global/modal';
import _ from 'lodash';
import Wishlist from '../wishlist';
import { normalizeFormData } from './utils/api';
import { initRadioOptions } from './aria';
import { isBrowserIE, convertIntoArray } from './utils/ie-helpers';
import {
	initSwatchDropdownOption
} from '../custom/product-swatch-dropdown';
import {
	initCustomPatternedVinyl,
	updateCustomVinylDisplay,
	createVinylOptions
} from '../custom/product-patterned-vinyl';
import {
	tabulateProductDescription,
	shippingRestrictions
} from '../custom/product-tabs';
import {
	colorTooltip,
	priceTooltip,
	supacolorTooltip,
	patternVinylTooltip
} from '../custom/product-tooltips';
import {
	activateProductAttributesFromUrl,
	addCommas,
	applyFieldAttributeNames,
	listenCustomModalClose,
	getCustomField,
	fetchProductSwatches
} from '../custom/product-helpers';
import {
	customArtworkProduct
} from '../product/custom-artwork';
import LocalCart from '../global/local-cart';
import DragAndDropForm from '../global/drag-drop-form';
import SanmarImages, { productIsSanmar } from '../custom/product-sanmar';

const localCart = new LocalCart();

const optionsTypesMap = {
    INPUT_FILE: 'input-file',
    INPUT_TEXT: 'input-text',
    INPUT_NUMBER: 'input-number',
    INPUT_CHECKBOX: 'input-checkbox',
    TEXTAREA: 'textarea',
    DATE: 'date',
    SET_SELECT: 'set-select',
    SET_RECTANGLE: 'set-rectangle',
    SET_RADIO: 'set-radio',
    SWATCH: 'swatch',
    PRODUCT_LIST: 'product-list',
};

const DEFAULT_CART_MESSAGES = {
	'dropship': (brand, shippingMethod) => (`This product is DROPSHIP ONLY. This item will be shipped${shippingMethod ? ` ${shippingMethod.toUpperCase()}`: ''} directly from ${brand} separate from your order.`),
	'location': (location, shippingMethod) => (`${location.toUpperCase()} ONLY product; will make your entire order ship${shippingMethod ? ` ${shippingMethod.toUpperCase()}`: ''} from our ${location} location.`),
	'shipping' : (shippingMethod) => (`Ships${shippingMethod ? ` ${shippingMethod.toUpperCase()}`: 'GROUND'} ONLY and does not qualify for Next-Day or 2-Day Air even if that is chosen shipping method.`)
};

export default class ProductDetails {
	constructor($scope, context, productAttributesData = {}) {
		this.$overlay = $('[data-cart-item-add] .loadingOverlay');
		this.$scope = $scope;
		this.context = context;
		this.context.customFields = this.context.customFields ? this.context.customFields : [];
		window.bcContext = this.context;
		this.imageGallery = new ImageGallery($('[data-image-gallery]', this.$scope));
		this.imageGallery.init();
		this.listenQuantityChange();
		this.initRadioAttributes();
        Wishlist.load(this.context);
		// HTW custom code
		this.htwInitializer();

		const $form = $('form[data-cart-item-add]', $scope);
		const $addToCart = $('#form-action-addToCart');
		const $productOptionsElement = $('[data-product-option-change]', $form);
		const hasOptions = $productOptionsElement.html().trim().length;

		const hasDefaultOptions = $productOptionsElement.find('[data-default]').length;

        $('[data-product-attribute]').each((__, value) => {
            const type = value.getAttribute('data-product-attribute');

            this._makeProductVariantAccessible(value, type);
        });

		$productOptionsElement.on('change', event => {
			this.productOptionsChanged(event);
			this.setProductVariant();
		});

	    let toggleStatus = false;

      $form.on("submit", (event) => {
        toggleStatus = true;
        this.addProductToCart(event, $form[0]);
      });
      $addToCart.on("click", (event) => {
        setTimeout(() => {
          if (toggleStatus === false) {
            console.log(toggleStatus);
            this.showMessageBox("Please fill out all required fields", "danger");
            window.setTimeout(() => {
              this.showMessageBox(null);
            }, 4000);
          }
        }, 500);
      });

		// Update product attributes. Also update the initial view in case items are oos
		// or have default variant properties that change the view
		if ((_.isEmpty(productAttributesData) || hasDefaultOptions) && hasOptions) {
			const $productId = $('[name="product_id"]', $form).val();

			utils.api.productAttributes.optionChange($productId, $form.serialize(), 'products/bulk-discount-rates', (err, response) => {
				const attributesData = response.data || {};
				window.BCData.product_attributes = attributesData;
				const attributesContent = response.content || {};
				this.updateProductAttributes(attributesData);
				if (hasDefaultOptions) {
					this.updateView(attributesData, attributesContent);
				} else {
					this.updateDefaultAttributesForOOS(attributesData);
				}
			});
		} else {
			this.updateProductAttributes(productAttributesData);
		}

		$productOptionsElement.show();

		this.previewModal = modalFactory('#previewModal')[0];
	}

    _makeProductVariantAccessible(variantDomNode, variantType) {
        switch (variantType) {
        case optionsTypesMap.SET_RADIO:
        case optionsTypesMap.SWATCH: {
            initRadioOptions($(variantDomNode), '[type=radio]');
            break;
        }

        default: break;
        }
    }

	htwInitializer() {
		this.context.unitPrice = this.getUnitPriceFromPage();
		this.brandName = this.context.brand !== undefined ? this.context.brand.name : 'the manufacturer';
		this.warehouseLocation = null;
		this.isCustomPatternedVinyl = document.querySelector('.productView-title').textContent.match(/[Cc]ustom\s[A-z]+\s[Vv]inyl$/);
		this.isLocationSpecific = false;
		this.isDropship = false;
		this.shippingMethod = false;
		this.locationColors = [];
		this.dropshipColors = [];
		this.groundColors = [];
		this.processCustomFields(this.context);
		const productHasOptions = document.querySelectorAll('.productView-options .form-field').length > 0;
		const sanmarProduct = productIsSanmar(this.brandName);
		if (productHasOptions) {
			applyFieldAttributeNames();
			initSwatchDropdownOption();
			if (this.isCustomPatternedVinyl) {
				initCustomPatternedVinyl('.productView-image', true);
			}
			activateProductAttributesFromUrl();
		}
		if (sanmarProduct) {
			//this.loginForPricing();
			this.sanmarImages = new SanmarImages(this.imageGallery, this.context.product);
			this.sanmarImages.init();
		} else {
			this.showPricing();
			priceTooltip();
			patternVinylTooltip(this.mask);
			supacolorTooltip(this.reorder, this.proof);
			colorTooltip(this.isDropship, this.dropshipColors, this.locationColors);
			shippingRestrictions();
			tabulateProductDescription(this.context.customFields);
			this.handleSupaColorProduct(this.context, localCart);
			this.handleCustomArtworkProduct(this.context.product);
			this.dragAndDropForm = new DragAndDropForm();
			listenCustomModalClose();
		}
		this.updateProductAlert();
		this.applySimilarProductSwatches();
	}

	loginForPricing() {
		// customer is logged in
		if (document.querySelector('[data-customer-id]')) {
			this.showPricing();
			return;
		}
		const lfp = document.querySelector('.login-for-pricing');
		const atc = document.querySelector('.add-to-cart-controls');
		if (lfp) {
			lfp.style.display = '';
		}
		if (atc) {
			atc.parentElement.removeChild(atc);
		}
	}

	showPricing() {
		const lfp = document.querySelector('.login-for-pricing');
		const atc = document.querySelector('.add-to-cart-controls');
		const price = document.querySelector('.productView-price');
		if (atc && price) {
			atc.style.display = '';
			price.style.display = '';
		}
		if (lfp) {
			lfp.parentElement.removeChild(lfp);
		}
	}

	setProductVariant() {
		const unsatisfiedRequiredFields = [];
		const options = [];

		Array.prototype.slice.call(document.querySelectorAll('[data-product-attribute]')).forEach(value => {
			const optionLabel = value.children[0].innerText;
			const optionTitle = optionLabel.split(':')[0].trim();
			const required = optionLabel.toLowerCase().includes('required');
			const type = value.getAttribute('data-product-attribute');
			if ((type === 'input-file' || type === 'input-text' || type === 'input-number') && value.querySelector('input').value === '' && required) {
				unsatisfiedRequiredFields.push(value);
			}
			if (type === 'textarea' && value.querySelector('textarea').value === '' && required) {
				unsatisfiedRequiredFields.push(value);
			}
			if (type === 'date') {
				const isSatisfied = Array.from(value.querySelectorAll('select')).every((select) => select.selectedIndex !== 0);
				if (isSatisfied) {
					const dateString = Array.from(value.querySelectorAll('select')).map((x) => x.value).join('-');
					options.push(`${optionTitle}:${dateString}`);
					return;
				}
				if (required) {
					unsatisfiedRequiredFields.push(value);
				}
			}
			if (type === 'set-select') {
				const select = value.querySelector('select');
				const selectedIndex = select.selectedIndex;
				if (selectedIndex !== 0) {
					options.push(`${optionTitle}:${select.options[selectedIndex].innerText}`);
					return;
				}
				if (required) {
					unsatisfiedRequiredFields.push(value);
				}
			}
			if (type === 'set-rectangle' || type === 'set-radio' || type === 'swatch' || type === 'input-checkbox' || type === 'product-list') {
				const checked = value.querySelector(':checked');
				if (checked) {
                    const getSelectedOptionLabel = () => {
                        const productVariantslist = convertIntoArray(value.children);
                        const matchLabelForCheckedInput = inpt => inpt.dataset.productAttributeValue === checked.value;
                        return productVariantslist.filter(matchLabelForCheckedInput)[0];
                    };
                    if (type === 'set-rectangle' || type === 'set-radio' || type === 'product-list') {
                        const label = isBrowserIE ? getSelectedOptionLabel().innerText.trim() : checked.labels[0].innerText;
                        if (label) {
                            options.push(`${optionTitle}:${label}`);
                        }
                    }

                    if (type === 'swatch') {
                        const label = isBrowserIE ? getSelectedOptionLabel().children[0] : checked.labels[0].children[0];
                        if (label) {
                            options.push(`${optionTitle}:${label.title}`);
                        }
                    }

                    if (type === 'input-checkbox') {
                        options.push(`${optionTitle}:Yes`);
                    }

                    return;
                }

				if (type === 'input-checkbox') {
					options.push(`${optionTitle}:No`);
				}

				if (required) {
					unsatisfiedRequiredFields.push(value);
				}
			}
		});

		let productVariant = unsatisfiedRequiredFields.length === 0 ? options.sort().join(', ') : 'unsatisfied';
		const view = $('.productView');

		if (productVariant) {
			productVariant = productVariant === 'unsatisfied' ? '' : productVariant;
			if (view.attr('data-event-type')) {
				view.attr('data-product-variant', productVariant);
			} else {
				const productName = view.find('.productView-title')[0].innerText.replace(/"/g, '\\$&');
				const card = $(`[data-name="${productName}"]`);
				card.attr('data-product-variant', productVariant);
			}
		}
	}

	/**
     * Since $productView can be dynamically inserted using render_with,
     * We have to retrieve the respective elements
     *
     * @param $scope
     */
	getViewModel($scope) {
		return {
			$priceWithTax: $('[data-product-price-with-tax]', $scope),
			$priceWithoutTax: $('[data-product-price-without-tax]', $scope),
			rrpWithTax: {
				$div: $('.rrp-price--withTax', $scope),
				$span: $('[data-product-rrp-with-tax]', $scope),
			},
			rrpWithoutTax: {
				$div: $('.rrp-price--withoutTax', $scope),
				$span: $('[data-product-rrp-price-without-tax]', $scope),
			},
			nonSaleWithTax: {
				$div: $('.non-sale-price--withTax', $scope),
				$span: $('[data-product-non-sale-price-with-tax]', $scope),
			},
			nonSaleWithoutTax: {
				$div: $('.non-sale-price--withoutTax', $scope),
				$span: $('[data-product-non-sale-price-without-tax]', $scope),
			},
			priceSaved: {
				$div: $('.price-section--saving', $scope),
				$span: $('[data-product-price-saved]', $scope),
			},
			priceNowLabel: {
				$span: $('.price-now-label', $scope),
			},
			priceLabel: {
				$span: $('.price-label', $scope),
			},
			$weight: $('.productView-info [data-product-weight]', $scope),
			$increments: $('.form-field--increments :input', $scope),
			$addToCart: $('#form-action-addToCart', $scope),
			$wishlistVariation: $('[data-wishlist-add] [name="variation_id"]', $scope),
			stock: {
				$container: $('.form-field--stock', $scope),
				$input: $('[data-product-stock]', $scope),
			},
			sku: {
				$label: $('.productView-sku', $scope),
				$value: $('[data-product-sku]', $scope),
			},
			upc: {
				$label: $('dt.upc-label', $scope),
				$value: $('[data-product-upc]', $scope),
			},
			quantity: {
				$text: $('.incrementTotal', $scope),
				$input: $('[name=qty\\[\\]]', $scope),
			},
			$bulkPricing: $('.productView-info-bulkPricing', $scope),
		};
	}

	/**
     * Checks if the current window is being run inside an iframe
     * @returns {boolean}
     */
	isRunningInIframe() {
		try {
			return window.self !== window.top;
		} catch (e) {
			return true;
		}
	}

	/**
     *
     * Handle product options changes
     *
     */
	productOptionsChanged(event) {
		const $changedOption = $(event.target);
		const $form = $changedOption.parents('form');
		const productId = $('[name="product_id"]', $form).val();

		// Do not trigger an ajax request if it's a file or if the browser doesn't support FormData
		if ($changedOption.attr('type') === 'file' || window.FormData === undefined) {
			return;
		}

		utils.api.productAttributes.optionChange(productId, $form.serialize(), 'products/bulk-discount-rates', (err, response) => {
			if (err) {
				console.error(err);
			}
			response = response || {data: {}, content: {}}
			const productAttributesData = response.data || {};
			const productAttributesContent = response.content || {};
			this.updateProductAttributes(productAttributesData);
			this.updateView(productAttributesData, productAttributesContent);
		});
	}

	showProductImage(image) {
        if (_.isPlainObject(image)) {
            const zoomImageUrl = utils.tools.imageSrcset.getSrcset(
                image.data,
                { '1x': this.context.zoomSize },
                /*
                    Should match zoom size used for data-zoom-image in
                    components/products/product-view.html

                    Note that this will only be used as a fallback image for browsers that do not support srcset

                    Also note that getSrcset returns a simple src string when exactly one size is provided
                */
            );

            const mainImageUrl = utils.tools.imageSrcset.getSrcset(
                image.data,
                { '1x': this.context.productSize },
                /*
                    Should match fallback image size used for the main product image in
                    components/products/product-view.html

                    Note that this will only be used as a fallback image for browsers that do not support srcset

                    Also note that getSrcset returns a simple src string when exactly one size is provided
                */
            );

            const mainImageSrcset = utils.tools.imageSrcset.getSrcset(image.data);

            this.imageGallery.setAlternateImage({
                mainImageUrl,
                zoomImageUrl,
                mainImageSrcset,
            });
        } else {
            this.imageGallery.restoreImage();
        }
    }

	/**
     *
     * Handle action when the shopper clicks on + / - for quantity
     *
     */
	listenQuantityChange() {
		this.$scope.on('click', '[data-quantity-change] button', event => {
			event.preventDefault();
			const $target = $(event.currentTarget);
			const viewModel = this.getViewModel(this.$scope);
			const $input = viewModel.quantity.$input;
			const quantityMin = parseInt($input.data('quantityMin'), 10);
			const quantityMax = parseInt($input.data('quantityMax'), 10);

			let qty = parseInt($input.val(), 10);

			// If action is incrementing
			if ($target.data('action') === 'inc') {
				// If quantity max option is set
				if (quantityMax > 0) {
					// Check quantity does not exceed max
					if ((qty + 1) <= quantityMax) {
						qty++;
					}
				} else {
					qty++;
				}
			} else if (qty > 1) {
				// If quantity min option is set
				if (quantityMin > 0) {
					// Check quantity does not fall below min
					if ((qty - 1) >= quantityMin) {
						qty--;
					}
				} else {
					qty--;
				}
			}

			// update hidden input
			viewModel.quantity.$input.val(qty);
			// update text
			viewModel.quantity.$text.text(qty);
			
			this.qtyChangePriceHandler();
		});

		const productQty = document.getElementById('qty[]');
		if (productQty) {
			productQty.addEventListener('change', e => {
				this.qtyChangePriceHandler();
			});
		}
	}

	/**
     *
     * Add a product to cart
     *
     */
	addProductToCart(event, form) {
		this.handleSupaColorProduct(this.context, localCart);
		const $addToCartBtn = $('#form-action-addToCart', $(event.target));
		const originalBtnVal = $addToCartBtn.val();
		const waitMessage = $addToCartBtn.data('waitMessage');

		// Do not do AJAX if browser doesn't support FormData
		if (window.FormData === undefined) {
			return;
		}

		// Prevent default
		event.preventDefault();

		$addToCartBtn
			.val(waitMessage)
			.prop('disabled', true);

		this.$overlay.show();

		// Add item to cart
		utils.api.cart.itemAdd(normalizeFormData(new FormData(form)), (err, response) => {

			const errorMessage = err || response.data.error;

			$addToCartBtn
				.val(originalBtnVal)
				.prop('disabled', false);

			this.$overlay.hide();

			// Guard statement
			if (errorMessage) {
				// Strip the HTML from the error message
				const tmp = document.createElement('DIV');
				tmp.innerHTML = errorMessage;

				return showAlertModal(tmp.textContent || tmp.innerText);
			}

			const cartItem = {
				id: response.data.cart_item.id,
				productId: parseInt(response.data.cart_item.product_id, 10),
				unitPrice: this.context.unitPrice,
				qty: document.getElementById('qty[]') ? parseInt(document.getElementById('qty[]').value, 10) : 1,
				options: Array.prototype.slice.call(document.querySelectorAll('.productView-options :checked')).filter(el => (el.nodeName !== 'OPTION')).map(input => this.mapInputToProps(input)).filter(o => (o))
			};
			if ([4827, 4829].indexOf(cartItem.productId) > -1) {
				cartItem.vinylOptions = createVinylOptions();
			}
			localCart.addProductToLocalCart(cartItem);

			const sku = BCData.product_attributes.sku;
			if (typeof sku === 'string' && sku.indexOf('DEPOSIT-') > -1) {
				window.location = '/checkout.php';
			}
			this.updateCartContent(this.previewModal, response.data.cart_item.hash, () => {
				this.showMessageBox('Item was successfully added to cart!', 'success');
				window.setTimeout(() => {
					this.showMessageBox(null);
				}, 4000);
				$('html, body').animate({
					scrollTop: 0,
				}, 200);
				// const cartPreview = document.querySelector('[data-cart-preview]');
				// const cartQuantity = parseInt(cartPreview.querySelector('.countPill').textContent, 10) || 1;
				$('body').trigger('update-cart-preview');
			});
		});
	}
	mapInputToProps(input) {
		const inputLabel = document.querySelector(`[for="${input.id}"]`);
		const optionId = parseInt(input.name.match(/\d+/)[0]);
		const field = document.querySelector(`[data-option-id="${optionId}"]`);
		if (!inputLabel || !field) {
			return null;
		}
		const attributeType = input.id.split(/__\d/)[0];
		let fieldLabel = field.querySelector('.form-label');
		let displayName = input.value;
		switch(field.getAttribute('data-product-attribute')) {
			case 'set-rectangle':
				displayName = inputLabel.textContent.trim();
				break;
			case 'swatch':
				fieldLabel = field.previousElementSibling;
				displayName = inputLabel.querySelector(`.form-option-variant`).title.trim();
				break;
			default:
				break;
		}
		const labelText = fieldLabel.textContent.trim().split(':')[0];

		const props = {
			displayName: displayName,
			id: parseInt(input.name.match(/\d+/)[0]),
			sku: document.querySelector('[itemprop="sku"]').textContent.trim(),
			label: labelText,
			type: attributeType,
			value: parseInt(input.value),
		}
		if (attributeType == 'attribute_swatch') {
			props.style = document.querySelector(`[for="${input.id}"] .form-option-variant`).style;
		}
		if (optionId === 4702 && document.getElementById('pattern-canvas')) {
			props.style = document.getElementById('pattern-canvas').getAttribute('data-pattern');
		}
		return props;
	}
	/**
     * Get cart contents
     *
     * @param {String} cartItemId
     * @param {Function} onComplete
     */
	getCartContent(cartItemId, onComplete) {
		const options = {
			template: 'cart/preview',
			params: {
				suggest: cartItemId,
			},
			config: {
				cart: {
					suggestions: {
						limit: 4,
					},
				},
			},
		};
		utils.api.cart.getContent(options, onComplete);
	}

	/**
     * Redirect to url
     *
     * @param {String} url
     */
	redirectTo(url) {
		if (this.isRunningInIframe() && !window.iframeSdk) {
			window.top.location = url;
		} else {
			window.location = url;
		}
	}

	/**
     * Update cart content
     *
     * @param {Modal} modal
     * @param {String} cartItemId
     * @param {Function} onComplete
     */
	updateCartContent(modal, cartItemId, onComplete) {
		this.getCartContent(cartItemId, (err, response) => {
			if (err) {
				return;
			}

			modal.updateContent(response);

			// Update cart counter
			const $body = $('body');
			const $cartQuantity = $('[data-cart-quantity]', modal.$content);
			const $cartCounter = $('.navUser-action .cart-count');
			const quantity = $cartQuantity.data('cartQuantity') || 0;

			$cartCounter.addClass('cart-count--positive');
			$body.trigger('cart-quantity-update', quantity);

			if (onComplete) {
				onComplete(response);
			}
		});
	}

	/**
     * Show an message box if a message is passed
     * Hide the box if the message is empty
     * @param  {String} message
     */
	showMessageBox(message, status='info') {
		const $messageBox = $('.productAttributes-message');
		$messageBox
			.removeClass(`alertBox--${status}`)
			.removeClass('alertBox--info')
			.removeClass('alertBox--success')
			.removeClass('alertBox--warning')
			.removeClass('alertBox--danger');

		if (message) {
			$messageBox.addClass(`alertBox--${status}`);
			$('.alertBox-message', $messageBox).text(message);
			$messageBox.show();
		} else {
			$messageBox.hide();
		}
	}

	/**
     * Hide the pricing elements that will show up only when the price exists in API
     * @param viewModel
     */
	clearPricingNotFound(viewModel) {
		viewModel.rrpWithTax.$div.hide();
		viewModel.rrpWithoutTax.$div.hide();
		viewModel.nonSaleWithTax.$div.hide();
		viewModel.nonSaleWithoutTax.$div.hide();
		viewModel.priceSaved.$div.hide();
		viewModel.priceNowLabel.$span.hide();
		viewModel.priceLabel.$span.hide();
	}

	setContextImage(image) {
		const imgSrc = image.data.replace(/{:size}/g, '60x60');
		this.context.thumbnail = imgSrc;
	}

	setContextPrice(price) {
		this.context.unitPrice = price;
	}


	getUnitPriceFromPage() {
		const productView = document.querySelector('[data-product-price]');
		if (productView) {
			return parseFloat(productView.getAttribute('data-product-price')) || 0;
		}
		return Array.prototype.slice.call(document.querySelectorAll('.productView-price .price')).filter(el => {
			return el.textContent.indexOf('$') > -1;
		}).reduce((acc, span) => {
			const price = parseFloat(span.textContent.trim().replace(/[$,]/g, ''));
			acc = !isNaN(price) ? price : acc;
			return acc;
		}, 0);
	}

	getUnitPriceFromContext() {
		return this.context.unitPrice || this.getUnitPriceFromPage();
	}

	getDiscountPrice(price, qty) {
		const unitPrice = price || this.getUnitPriceFromContext();
		if (this.context.bulkDiscountRates) {
			const discountRate = this.context.bulkDiscountRates.filter(rate => {
				return rate.min <= qty && qty <= (rate.max !== 0 ? rate.max : qty);
			}).map(rate => {
				if (rate.type === 'percent') {
					return unitPrice * ((100 - rate.discount.value) / 100);
				}
				return rate.discount ? rate.discount.value : unitPrice;
			});
			return discountRate.length > 0 ? parseFloat(discountRate[0].toFixed(2)) : parseFloat(unitPrice.toFixed(2));
		}
		return parseFloat(unitPrice.toFixed(2));
	}
	/**
     * Update the view of price when a product option changes or qty changes
     * @param {float} price Product unit price
     */
	updateTotalPriceView(priceEl, price) {
		const qty = parseInt(document.getElementById('qty[]').value);
		const unitPrice = this.getDiscountPrice(price, qty);
		const formattedUnitPrice = `$${addCommas(unitPrice)}`;
		const ppuEl = document.querySelector('.productView-price .price--per-unit') || document.createElement('div');
		if (qty > 1) {
			const formattedTotalPrice = `$${addCommas(unitPrice * qty)}`;
			// populate "price per unit" div (qty @ unit price)
			ppuEl.className = 'price price--per-unit';
			ppuEl.textContent = `${qty} @ ${formattedUnitPrice}`;
			ppuEl.style.display = 'block';
			// update default price span with total price (unit price * qty)
			if (typeof priceEl.text === 'function') {
				priceEl.text(formattedTotalPrice);
				priceEl.after(ppuEl);
			} else {
				priceEl.textContent = formattedTotalPrice;
				priceEl.insertAdjacentElement('afterend', ppuEl);
			}
			return false;
		}
		ppuEl.style.display = 'none';
		if (typeof priceEl.text === 'function') {
			priceEl.text(formattedUnitPrice);
		} else {
			priceEl.textContent = formattedUnitPrice;
		}
	}

	/**
     * Update the view of price, messages, SKU and stock options when a product option changes
     * @param  {Object} data Product attribute data
     */
	updatePriceView(viewModel, price) {
		this.clearPricingNotFound(viewModel);
		if (price.with_tax) {
			viewModel.priceLabel.$span.show();
			this.setContextPrice(price.with_tax.value);
			this.updateTotalPriceView(viewModel.$priceWithTax, price.with_tax.value);
			document.getElementsByTagName("klarna-placement")[0].setAttribute("data-total_amount",
			product.price.without_tax.value);
			window.KlarnaOnsiteService = window.KlarnaOnsiteService || []
			window.KlarnaOnsiteService.push({ eventName: 'refresh-placements' })
			// viewModel.$priceWithTax.html(price.with_tax.formatted);
		}

		if (price.without_tax) {
			viewModel.priceLabel.$span.show();
			this.setContextPrice(price.without_tax.value);
			this.updateTotalPriceView(viewModel.$priceWithoutTax, price.without_tax.value);
			// viewModel.$priceWithoutTax.html(price.without_tax.formatted);
		}

		if (price.rrp_with_tax) {
			viewModel.rrpWithTax.$div.show();
			viewModel.rrpWithTax.$span.html(price.rrp_with_tax.formatted);
		}

		if (price.rrp_without_tax) {
			viewModel.rrpWithoutTax.$div.show();
			viewModel.rrpWithoutTax.$span.html(price.rrp_without_tax.formatted);
		}

		if (price.saved) {
			viewModel.priceSaved.$div.show();
			viewModel.priceSaved.$span.html(price.saved.formatted);
		}

		if (price.non_sale_price_with_tax) {
			viewModel.priceLabel.$span.hide();
			viewModel.nonSaleWithTax.$div.show();
			viewModel.priceNowLabel.$span.show();
			viewModel.nonSaleWithTax.$span.html(price.non_sale_price_with_tax.formatted);
			viewModel.nonSaleWithTax.$span.data('price', price.non_sale_price_with_tax.value);
		}

		if (price.non_sale_price_without_tax) {
			viewModel.priceLabel.$span.hide();
			viewModel.nonSaleWithoutTax.$div.show();
			viewModel.priceNowLabel.$span.show();
			viewModel.nonSaleWithoutTax.$span.html(price.non_sale_price_without_tax.formatted);
			viewModel.nonSaleWithoutTax.$span.data('price', price.non_sale_price_without_tax.value);
		}
	}

	/**
     * Update the view of price, messages, SKU and stock options when a product option changes
     * @param  {Object} data Product attribute data
     */
	updateView(data, content = null) {
		if (data.bulk_discount_rates) {
			this.context.bulkDiscountRates = data.bulk_discount_rates;
		}
		const viewModel = this.getViewModel(this.$scope);
		if (this.isCustomPatternedVinyl) {
			updateCustomVinylDisplay();
		}

		if (_.isObject(data.price)) {
			this.updatePriceView(viewModel, data.price);
		}

		if (_.isObject(data.weight)) {
			viewModel.$weight.html(data.weight.formatted);
		}

		// If SKU is available
		if (data.sku) {
			this.context.sku = data.sku;
			viewModel.sku.$value.text(data.sku);
			viewModel.sku.$label.show();
		} else {
			viewModel.sku.$label.hide();
			viewModel.sku.$value.text('');
		}

		// If UPC is available
		if (data.upc) {
			viewModel.upc.$value.text(data.upc);
			viewModel.upc.$label.show();
		} else {
			viewModel.upc.$label.hide();
			viewModel.upc.$value.text('');
		}

		// if stock view is on (CP settings)
		if (viewModel.stock.$container.length && _.isNumber(data.stock)) {
			// if the stock container is hidden, show
			viewModel.stock.$container.removeClass('u-hiddenVisually');

			viewModel.stock.$input.text(data.stock);
		} else {
			viewModel.stock.$container.addClass('u-hiddenVisually');
			viewModel.stock.$input.text(data.stock);
		}

		if (data.purchasing_message !== null || data.stock_message !== null) {
			const message = data.sku ? 'The selected product combination is currently on backorder.' : data.purchasing_message;
			this.showMessageBox(message, 'danger');
		} else {
			this.updateProductAlert();
		}

		this.updateDefaultAttributesForOOS(data);

		// If Bulk Pricing rendered HTML is available
		if (data.bulk_discount_rates && content) {
			viewModel.$bulkPricing.html(content);
		} else if (typeof (data.bulk_discount_rates) !== 'undefined') {
			viewModel.$bulkPricing.html('');
		}
		window.bcContext = this.context;
	}

	qtyChangePriceHandler() {
		const priceEls = Array.prototype.slice.call(document.querySelectorAll('.productView-price .price')).filter(el => {
			return el.textContent.indexOf('$') > -1;
		});
		if (priceEls.length > 0) {
			const priceEl = priceEls[0];
			this.updateTotalPriceView(priceEl);
		}
	}

	checkDropshipProduct(options) {
		const allDropship = this.dropshipColors.indexOf('all') > -1;
		const dropshipSku = this.dropshipColors.indexOf(this.context.sku) > -1;
		const isDropship = allDropship || dropshipSku || options.reduce((acc, o) => {
			const starRegex = /[\s\d]\*$/;
			const hasStar = starRegex.test(o.trim());
			const inColorList = this.dropshipColors.indexOf(o.trim()) > -1;
			if (!acc && (hasStar || inColorList)) {
				acc = true;
			}
			return acc;
		}, false);
		return isDropship;
	}

	checkLocationProduct(options) {
		const allLocationSpecific = this.locationColors.indexOf('all') > -1;
		const locationSku = this.locationColors.indexOf(this.context.sku) > -1;
		const isLocationSpecific = allLocationSpecific || locationSku || options.reduce((acc, o) => {
			const starsRegex = /[\s\d]\*\*$/;
			const hasStars = starsRegex.test(o.trim());
			const inLocationList = this.locationColors.indexOf(o.trim()) > -1;
			if (!acc && (hasStars || inLocationList)) {
				acc = true;
			}
			return acc;
		}, false);
		return isLocationSpecific;
	}

	checkGroundProduct(options) {
		const allGround = this.groundColors.indexOf('all') > -1;
		const groundSku = this.groundColors.indexOf(this.context.sku) > -1;
		const isGround = allGround || groundSku || options.reduce((acc, o) => {
			if (!acc && this.groundColors.indexOf(o.trim()) > -1) {
				acc = true;
			}
			return acc;
		}, false);
		return isGround;
	}

	getSelectedOptionValues() {
		return Array.prototype.slice.call(document.querySelectorAll('.productView-options .form-field')).filter(el => {
			const input = el.querySelector(':checked')
			return input && input.nodeName !== 'OPTION';
		}).map(el => {
			const input = el.querySelector(':checked');
			// const inputId = input.nodeName === 'OPTION' ? input.parentElement.id : input.id;
			const labelEl = document.querySelector(`[for="${input.id}"]`);
			if (el.className.indexOf('swatch') > -1) {
				return labelEl.querySelector(`.form-option-variant`).title.trim();
			}
			return labelEl.textContent.trim();
		});
	}

	updateProductAlert() {
		const messages = [];
		const selectedOptions = this.getSelectedOptionValues();
		const isDropship = this.checkDropshipProduct(selectedOptions);
		if (isDropship) {
			if (this.dropshipMessage) {
				messages.push(this.dropshipMessage);
			} else {
				messages.push(DEFAULT_CART_MESSAGES['dropship'](this.brandName, this.shippingMethod));
			}
		}
		const isLocation = this.checkLocationProduct(selectedOptions);
		if (isLocation) {
			if (this.locationMessage) {
				messages.push(this.locationMessage);
			} else {
				messages.push(DEFAULT_CART_MESSAGES['location'](this.warehouseLocation, this.shippingMethod));
			}
		}
		const isGround = this.checkGroundProduct(selectedOptions);
		if (isGround) {
			if (this.shippingMessage) {
				messages.push(this.shippingMessage);
			} else {
				messages.push(DEFAULT_CART_MESSAGES['shipping'](this.shippingMethod));
			}
		}
		if (messages.length > 0) {
			messages.forEach(m => {
				this.showMessageBox(m);
			});
			return false;
		}
		this.showMessageBox(null);
	}

	updateDefaultAttributesForOOS(data) {
		const viewModel = this.getViewModel(this.$scope);
		if (!data.purchasable || !data.instock) {
			viewModel.$addToCart.prop('disabled', true);
			viewModel.$increments.prop('disabled', true);
		} else {
			viewModel.$addToCart.prop('disabled', false);
			viewModel.$increments.prop('disabled', false);
		}
	}

	getAttributeType($attribute) {
		const $parent = $attribute.closest('[data-product-attribute]');
		return $parent ? $parent.data('productAttribute') : null;
	}

	/**
     * Hide or mark as unavailable out of stock attributes if enabled
     * @param  {Object} data Product attribute data
     */
	updateProductAttributes(data) {
		const behavior = data.out_of_stock_behavior;
		const inStockIds = data.in_stock_attributes;
		const outOfStockMessage = ` (${data.out_of_stock_message})`;
		const _this = this;
		this.showProductImage(data.image);
		this.handleSupaColorProduct(this.context, localCart);
		if (behavior !== 'hide_option' && behavior !== 'label_option') {
			return false;
		}
		Array.prototype.slice.call(document.querySelectorAll('[data-product-attribute-value]')).forEach(attribute => {
			const $attribute = $(attribute);
			const attrId = parseInt($attribute.data('productAttributeValue'), 10);
			if (inStockIds.indexOf(attrId) !== -1) {
				_this.enableAttribute($attribute, behavior, outOfStockMessage);
			} else {
				_this.disableAttribute($attribute, behavior, outOfStockMessage);
			}
		});
	}

	disableAttribute($attribute, behavior, outOfStockMessage) {
		if (behavior === 'hide_option') {
			$attribute.hide();
		} else {
			$attribute.addClass('unavailable');
		}
		if (this.getAttributeType($attribute) === 'set-select') {
			return this.disableSelectOptionAttribute($attribute, behavior, outOfStockMessage);
		}
	}

	disableSelectOptionAttribute($attribute, behavior, outOfStockMessage) {
		const $select = $attribute.parent();
		if (behavior === 'hide_option') {
			$attribute.toggleOption(false);
			// If the attribute is the selected option in a select dropdown, select the first option (MERC-639)
			if ($select.val() === $attribute.attr('value')) {
				$select[0].selectedIndex = 0;
			}
		} else {
			$attribute.attr('disabled', 'disabled');
			$attribute.html($attribute.html().replace(outOfStockMessage, '') + outOfStockMessage);
		}
	}

	enableAttribute($attribute, behavior, outOfStockMessage) {
		if (this.getAttributeType($attribute) === 'set-select') {
			return this.enableSelectOptionAttribute($attribute, behavior, outOfStockMessage);
		}
		if (behavior === 'hide_option') {
			$attribute.show();
		} else {
			$attribute.removeClass('unavailable');
		}
	}

	enableSelectOptionAttribute($attribute, behavior, outOfStockMessage) {
		if (behavior === 'hide_option') {
			$attribute.toggleOption(true);
		} else {
			$attribute.prop('disabled', false);
			$attribute.html($attribute.html().replace(outOfStockMessage, ''));
		}
	}

	/**
     * Allow radio buttons to get deselected
     */
	initRadioAttributes() {
		$('[data-product-attribute] input[type="radio"]', this.$scope).each((i, radio) => {
			const $radio = $(radio);
			// Only bind to click once
			if ($radio.attr('data-state') !== undefined) {
				$radio.on('click', () => {
					if ($radio.data('state') === true) {
						$radio.prop('checked', false);
						$radio.data('state', false);

						$radio.trigger('change');
					} else {
						$radio.data('state', true);
					}
				});
			}
			$radio.attr('data-state', $radio.prop('checked'));
		});
	}

	processCustomFields(context) {
		if (context.customFields !== undefined) {
			this.insertCrossSellLink(context.customFields);
			this.mask = getCustomField(context, 'mask', []);
			this.proof = getCustomField(context, 'proof', []);
			this.reorder = getCustomField(context, 'reorder', []);
			this.dropshipColors = getCustomField(context, 'dropship_colors', []);
			this.locationColors = getCustomField(context, 'location_colors', []);
			this.groundColors = getCustomField(context, 'ground_colors', []);
			this.shippingMethod = getCustomField(context, 'shipping_method', null);
			this.dropshipMessage = getCustomField(context, 'custom_dropship', null);
			this.locationMessage = getCustomField(context, 'custom_location', null);
			this.shippingMessage = getCustomField(context, 'custom_shipping', null);
			if (this.dropshipColors.length > 0) {
				this.isDropship = this.dropshipColors.indexOf('all') > -1;
			}
			if (this.locationColors.length > 0) {
				this.isLocationSpecific = this.locationColors.indexOf('all') > -1;
				this.warehouseLocation = getCustomField(context, 'location', 'Winterfell');
			}
		}
	}
	insertCrossSellLink(customFields) {
		const productOptions = document.querySelector('.productView-details .productView-options');
		if (!productOptions) {
			return;
		}
		customFields.forEach(cf => {
			if (cf.value.match(/^\//)) {
				const a = document.createElement('a');
				a.href = cf.value;
				a.target = '_blank';
				a.rel = 'nofollow noopener';
				a.className = 'cross-sell-link';
				a.textContent = cf.name;
				productOptions.appendChild(a);
			}
		})
	}
	applySimilarProductSwatches() {
		try {
			if (this.context.similarProducts && this.context.similarProducts.length > 0) {
				const productIds = this.context.similarProducts.map(p => (p.id));
				fetchProductSwatches(productIds);
			}
		} catch (error) {
			console.log(error);
		}
	}
	handleSupaColorProduct(context, localCart) {
		if (document.querySelector('.productView-title').textContent.match(/^[Ss]upacolor/)) {
			const productId = parseInt(context.productId, 10);
			const supaColorCount = localCart.items.filter(item => (item.productId === productId)).length;
			const dropdown = document.querySelector('.form-field.is-srOnly.set-select select');
			if (dropdown) {
				dropdown.selectedIndex = supaColorCount + 1;
			}
		}
	}
	handleCustomArtworkProduct(product) {
		const customArtwork = document.querySelector('[data-custom-artwork');
		if (!customArtwork || !product || product.options.length === 0) {
			return;
		}
		customArtworkProduct(product);
	}
}
