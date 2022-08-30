import $ from 'jquery';

const apiBaseURL = 'https://api.heattransferwarehouse.com/htw';

export const fetchSanmarProductImages = async (productId) => {
	const payload = await $.ajax({
		url: `${apiBaseURL}/products/${productId}/images`,
		complete: data => {
			const responseJSON = data.responseJSON || JSON.parse(data.responseText);
			let colorImgMap = [];
			if (data.status < 300) {
				colorImgMap = responseJSON.map(a => {
					const obj = a;
					obj.imgURLs = obj.imgURLs.filter(url => url.match(/\/nan/) === null);
					return obj;
				});
			}
			return colorImgMap;
		},
		error: err => {
			console.error(err);
			return [];
		},
	});
	return payload;
};

export const productIsSanmar = (brandName) => {
    const sanmarBrands = ['Alternative Apparel', 'American Apparel', 'Anvil', 'Bella + Canvas', 'Carhartt', 'Comfort Colors', 'CornerStone', 'District', 'District Made', 'Fruit of the Loom', 'Gildan', 'Hanes', 'Jerzees', 'Nike', 'Ogio', 'Port & Company', 'Port Authority', 'Rabbit Skins', 'Russell Outdoors', 'Sport-Tek'];
    return sanmarBrands.indexOf(brandName) > -1;
};

const productHasColorOptions = () => {
    return document.querySelectorAll('.form-field.swatch .form-option').length > 1;
};

const debounce = (func, wait, immediate) => {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
}

export default class SanmarImages {
    constructor($gallery, product) {
        this.$gallery = $gallery;
        this.product = product;
        this.images = []
        this.imagesLoaded = false;
    }

    init() {
        const brandName = this.product.brand ? this.product.brand.name : '';
        if (productIsSanmar(brandName) && productHasColorOptions()) {
            this.bindEvents();
        }
    }

    fetchSanmarProductImages(productId, optionValue) {
        $.ajax({
            url: `${apiBaseURL}/products/${productId}/images`,
            complete: data => {
                const responseJSON = data.responseJSON || JSON.parse(data.responseText);
                let colorImgMap = [];
                if (data.status < 300) {
                    colorImgMap = responseJSON.map(a => {
                        const obj = a;
                        obj.imgURLs = obj.imgURLs.filter(url => url.match(/\/nan/) === null);
                        return obj;
                    });
                }
                this.imagesLoaded = true;
                this.images = colorImgMap;
                if (optionValue) {
                    this.applySanmarImages(optionValue);
                }
            },
            error: err => {
                console.error(err);
                this.imagesLoaded = true;
                return [];
            },
        });
    };

    handleColorClick(e) {
        const colorOption = e.path.reduce((acc, el) => {
            if (!acc) {
                acc = el.classList.contains('form-option') ? el : acc;
            }
            return acc;
        }, null);
        if (!colorOption) {
            return;
        }
        const optionValue = colorOption.getAttribute('data-product-attribute-value');
        this.applySanmarImages(optionValue);
    }

    applySanmarImages(optionValue) {
        if (!this.images.length && !this.imagesLoaded) {
            this.fetchSanmarProductImages(this.product.id, optionValue);
            return;
        }
        let colorImages = this.images.filter(obj => (obj.value === optionValue));
        colorImages = colorImages.length > 0 ? colorImages[0].imgURLs : null;
        if (!colorImages) {
            return;
        }
        const sortedImages = this.sortColorImages(colorImages);
        this.createThumbnailGallery(sortedImages);
        const imgObj = {
            $selectedThumb: $(document.querySelector('.productView-thumbnail')),
            mainImageUrl: sortedImages[0],
            zoomImageUrl: sortedImages[0],
            mainImageSrcset: sortedImages[0],
        }
        console.log("imgObj", imgObj)
        this.$gallery.setMainImage(imgObj);
    }

    assignImageSortOrder(filename) {
        if (filename.match(/model_front/)) {
            return 0;
        }
        if (filename.match(/model_back/)) {
            return 1;
        }
        if (filename.match(/front/)) {
            return 2;
        }
        if (filename.match(/back/)) {
            return 3;
        }
        return 4;
    }

    sortColorImages(colorImages) {
        return colorImages.filter(Boolean).sort((a,b) => {
            const aSortOrder = this.assignImageSortOrder(a.toLowerCase());
            const bSortOrder = this.assignImageSortOrder(b.toLowerCase());
            if (aSortOrder == bSortOrder) {
                return 0
            }
            return aSortOrder < bSortOrder ? -1 : 1;
        })
    }

    createThumbnailGallery(colorImages) {
        const $gallery = this.$gallery;
        const gallery = document.querySelector('.productView-thumbnails');
        gallery.innerHTML = '';
        colorImages.map((url, i) => {
            const li = document.createElement('li');
            li.className = 'productView-thumbnail';

            const a = document.createElement('a');
            a.className = i === 0 ? 'productView-thumbnail-link is-active' : 'productView-thumbnail-link';
            a.href = url;
            a.setAttribute('data-image-gallery-item', '');
            a.setAttribute('data-image-gallery-new-image-url', url);
            a.setAttribute('data-image-gallery-zoom-image-url', url);
            a.addEventListener('click', e => {
                $gallery.selectNewImage(e);
            });

            const img = document.createElement('img');
            img.className = 'lazyloaded';
            img.src = url;

            a.appendChild(img);
            li.appendChild(a);
            return li;
        }).forEach(li => {
            gallery.appendChild(li);
        });
    }

    bindEvents() {
        const optionContainer = document.querySelector('.color-swatch-dropdown .option-swatch-container');
        if (!optionContainer) {
            return false;
        }
        this.handleColorClick = this.handleColorClick.bind(this);
        optionContainer.addEventListener('click', debounce(this.handleColorClick, 100));
    }
}
