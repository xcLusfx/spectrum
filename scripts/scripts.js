import {
	sampleRUM,
	buildBlock,
	loadHeader,
	loadFooter,
	decorateButtons,
	decorateIcons,
	decorateSections,
	decorateBlocks,
	decorateTemplateAndTheme,
	waitForLCP,
	loadBlocks,
	loadCSS,
	getMetadata,
	loadScript,
	toCamelCase,
	toClassName,
  } from './aem.js';
  
  // Define an execution context
  const pluginContext = {
	getAllMetadata,
	getMetadata,
	loadCSS,
	loadScript,
	sampleRUM,
	toCamelCase,
	toClassName,
  };
  
  const LCP_BLOCKS = []; // add your LCP blocks to the list
  
  //for experimentation
  const AUDIENCES = {
	mobile: () => window.innerWidth < 600,
	desktop: () => window.innerWidth >= 600,
	// define your custom audiences here as needed
  };
  
  /**
   * Gets all the metadata elements that are in the given scope.
   * @param {String} scope The scope/prefix for the metadata
   * @returns an array of HTMLElement nodes that match the given scope
   */
  export function getAllMetadata(scope) {
	return [...document.head.querySelectorAll(`meta[property^="${scope}:"],meta[name^="${scope}-"]`)]
	  .reduce((res, meta) => {
		const id = toClassName(meta.name
		  ? meta.name.substring(scope.length + 1)
		  : meta.getAttribute('property').split(':')[1]);
		res[id] = meta.getAttribute('content');
		return res;
	  }, {});
  }
  
  
  
  /**
   * Builds hero block and prepends to main in a new section.
   * @param {Element} main The container element
   */
  function buildHeroBlock(main) {
	const h1 = main.querySelector('h1');
	const picture = main.querySelector('picture');
	// eslint-disable-next-line no-bitwise
	if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
	  const section = document.createElement('div');
	  section.append(buildBlock('hero', { elems: [picture, h1] }));
	  main.prepend(section);
	}
  }
  
  /**
   * load fonts.css and set a session storage flag
   */
  async function loadFonts() {
	await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
	try {
	  if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
	} catch (e) {
	  // do nothing
	}
  }
  
  /**
   * Builds all synthetic blocks in a container element.
   * @param {Element} main The container element
   */
  function buildAutoBlocks(main) {
	try {
	  buildHeroBlock(main);
	} catch (error) {
	  // eslint-disable-next-line no-console
	  console.error('Auto Blocking failed', error);
	}
  }
  
  /**
   * Decorates the main element.
   * @param {Element} main The main element
   */
  // eslint-disable-next-line import/prefer-default-export
  export function decorateMain(main) {
	// hopefully forward compatible button decoration
	decorateButtons(main);
	decorateIcons(main);
	buildAutoBlocks(main);
	decorateSections(main);
	decorateBlocks(main);
  }
  
  /**
   * Loads everything needed to get to LCP.
   * @param {Element} doc The container element
   */
  async function loadEager(doc) {
	document.documentElement.lang = 'en';
	decorateTemplateAndTheme();
  
	// for Experimentation
	if (getMetadata('experiment')
	  || Object.keys(getAllMetadata('campaign')).length
	  || Object.keys(getAllMetadata('audience')).length) {
	  // eslint-disable-next-line import/no-relative-packages
	  const { loadEager: runEager } = await import('../plugins/experimentation/src/index.js');
	  await runEager(document, { audiences: AUDIENCES }, pluginContext);
	}
  
	const main = doc.querySelector('main');
	if (main) {
	  decorateMain(main);
	  document.body.classList.add('appear');
	  await waitForLCP(LCP_BLOCKS);
	}
  
	try {
	  /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
	  if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
		loadFonts();
	  }
	} catch (e) {
	  // do nothing
	}
  }
  
  /**
   * Loads everything that doesn't need to be delayed.
   * @param {Element} doc The container element
   */
  async function loadLazy(doc) {
	const main = doc.querySelector('main');
	await loadBlocks(main);
  
	const { hash } = window.location;
	const element = hash ? doc.getElementById(hash.substring(1)) : false;
	if (hash && element) element.scrollIntoView();
  
	loadHeader(doc.querySelector('header'));
	loadFooter(doc.querySelector('footer'));
  
	loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
	loadFonts();
  
	sampleRUM('lazy');
	sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
	sampleRUM.observe(main.querySelectorAll('picture > img'));
  
	 // for Experimentation
	 if ((getMetadata('experiment')
	 || Object.keys(getAllMetadata('campaign')).length
	 || Object.keys(getAllMetadata('audience')).length)) {
	 // eslint-disable-next-line import/no-relative-packages
	 const { loadLazy: runLazy } = await import('../plugins/experimentation/src/index.js');
	 await runLazy(document, { audiences: AUDIENCES }, pluginContext);
   }
  }
  
  export function jsx(html, ...args) {
	return html.slice(1).reduce((str, elem, i) => str + args[i] + elem, html[0]);
  }
  
  /**
   * Loads everything that happens a lot later,
   * without impacting the user experience.
   */
  function loadDelayed() {
	// eslint-disable-next-line import/no-cycle
	window.setTimeout(() => import('./delayed.js'), 3000);
	// load anything that can be postponed to the latest here
  }
  
  async function loadPage() {
	await loadEager(document);
	await loadLazy(document);
	loadDelayed();
  }
  
  loadPage();