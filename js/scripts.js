var statusTxtTimer;
$("#statusTxtSpan").on("change",function(){
	$(".statusDiv").animate({borderColor: "rgb(255, 215, 0)"},500);
	statusTxtTimer = setTimeout(function(){ $(".statusDiv").animate({borderColor: "#D0D0CD"},500); }, 501); //end animation event seems inconsistently supported across browsers so just use timer
});

var cDay = 1;
var dayLim = 31;
var cCash = 0;
var cMorale = 0;
var gOver = false;
var currentHoldings = [];
var standardImg, lastImg = "";
var standardTxt, lastTxt = "";
var standardEffectTxt, lastEffectTxt = "";
var cMarketData, oMarketData, gEvents;

function numberWithCommas(x) { 
	var parts = x.toString().split("."); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); 
	return parts.join(".");
}
function roundCurrency(rawC){ 
	var newC = parseFloat(rawC.toFixed(6));
	if (parseInt(rawC.toString().split(".")[0])>1) newC = Math.round(newC * 100) / 100; //number before decimal is > 1 so trim down to at most 2 decimal places
	return parseFloat(newC);
}
function formatDollar(rawD, dollar){ 
	return dollar + numberWithCommas(roundCurrency(rawD)); 
}
function formatPerc(rawPerc){ 
	return (Math.round(rawPerc * 100) / 100) + "%"; 
}
function randPropFromObj(obj) { 
	var keys = Object.keys(obj); 
	return obj[keys[ keys.length * Math.random() << 0]];
}
function displayCash(amount){ 
	$("#cashSpan").html(amount); 
}
function updateCash(amount){ 
	cCash = parseFloat(amount); 
	displayCash(formatDollar(cCash,"$"));
}
function updateHoldingValue(amount){ 
	$("#holdingsSpan").html(amount); 
}
function updateMorale(amount){ 
	if (amount > 100) amount = 100; 
	if (amount < 0) amount = 0; 
	cMorale = parseFloat(amount); 
	displayMorale(formatPerc(amount));
	if (cMorale<1) gameOver("rekt");
}

function displayMorale(amount){ 
	$(".moraleHealthBar").css("width", amount.toString()); 
	var moraleBorderRounding = "";
	if (parseInt(amount.replace("%",""))==100) {
		moraleBorderRounding = "5px";
	}
	$(".moraleHealthBar").css("border-top-right-radius",moraleBorderRounding);
	$(".moraleHealthBar").css("border-bottom-right-radius",moraleBorderRounding);
	$(".moraleHealthBarTxt").html(amount); 
}

function changeLocation(newLoc){
	//just in case user interrupted previous transition	by quickly changing location
	clearTimeout(statusTxtTimer);	
	$(".statusDiv").stop();
	$(".statusDiv").css("borderColor","D0D0CD"); 

	var newEvent = false;
	cDay++;

	if (cDay > dayLim) {
	 	gameOver("finish");
	 	return;
	}

	$("#locationsParent button").each(function(i) { $(this).prop("disabled",false);});
	$("#"+newLoc).prop("disabled",true);

	$("#dayCountSpan").html(cDay);

	if (cDay == dayLim) {
		dispFixedStatus(lastTxt, lastEffectTxt, lastImg, true);
		updateMarketData();
		return;
	}

	if (Math.random() < 0.78) {
		//78% of time we'll try and trigger an event from a location change
		var validEvents = {};
		Object.keys(gEvents).forEach(function(key) {
			if (key=="holdings"||key=="market"||key=="morale"){ //exclude selling events from location change
				Object.keys(gEvents[key]).forEach(function(key2) {
					if (key2!="BrainWallet" || (cCash >= 1000 && currentHoldings.length > 0)) {
						if (gEvents[key][key2].EffectLocations == "All" || $.inArray($("#"+newLoc).html(), gEvents[key][key2].EffectLocations) > -1) {	
							if (gEvents[key][key2].Appearances < gEvents[key][key2].MaxAppearances) {
								if (cDay - gEvents[key][key2].LastAppearance >= gEvents[key][key2].MinFrequencyGap) {
									if (key2!="ETHGiveaway" || currentAssetHoldings("ETH")>5) { //don't show ETH GiveAway if you don't have < 6 ETH
										if (key2!="Mother" || cCash < 10000) { //don't show the mcdonalds image if you have more than 10,000 cash!
											validEvents[key2] = gEvents[key][key2];
											validEvents[key2].key1 = key;  //remember parent reference so we can match to the object in gEvents later.
											validEvents[key2].key2 = key2; //remember parent referencs so we can match to the object in gEvents later.
										}
									}
								} 
							} 
						}
					} 
				});
			}
		});
		//validEvents now loaded with the subset we can choose from randomly accessing like: validEvents['BrainWallet'].Description
		if (Object.keys(validEvents).length > 0) {
			var randomProperty = randPropFromObj(validEvents);
			newEvent = true;
			triggerEvent(randomProperty);
		} else {
			//no event today because we ran out of valid events for this location/type and maxAppearances
			updateMarketData();
		}
	} else {
		updateMarketData();
	}
	if (!newEvent) dispFixedStatus(standardTxt,standardEffectTxt,standardImg, true);
}
function triggerEvent(theEvent){
	gEvents[theEvent.key1][theEvent.key2].Appearances++;
	gEvents[theEvent.key1][theEvent.key2].LastAppearance = cDay;

	$("#statusImg").attr("src",theEvent.img);
	$("#statusTxtSpan").html(theEvent.Description).trigger('change');
	$(".effectTxtDiv").html(theEvent.EffectText);

	switch(theEvent.key2) {
		case "RecieveCharity":
		case "RecieveSpank":
		case "WinBTC":
		case "Roubini":
		case "CharlieLee":
		case "Novogratz":
		case "ICO":
			updateMarketData();
			boughtAsset(theEvent.QuantityGiven, theEvent.DonateAssets[0], true);
			updateMorale(cMorale + theEvent.MoraleBoost);
	    	break;
	  	case "PeterSchiff":
	  	case "Buffett":
	  	case "Economics":
	    case "Delta":
	    case "Balina":
	    case "Mayer":
	    case "HumanFeces":
	    case "RogerVer":
	    case "CZBinance":
	    case "McAfee":
	    case "Mother":
	    	updateMarketData();
	    	updateMorale(cMorale + theEvent.MoraleBoost);
	    	break;
	    case "BadAddress": 
	    case "BadTransactionFee": 
	    case "Mempool":
	    	updateMorale(cMorale + theEvent.MoraleBoost);
	    	break;
	    case "BogdanoffPump": 
	    	updateMorale(cMorale + theEvent.MoraleBoost);
	    	var tickerObjs = {"BTC": { "Name": "Bitcoin", "Price": 10135.27,"PosDeviation": 4,"NegDeviation": 3}};
	    	updateMarketData(tickerObjs);
	    	break;
	    case "Winklevoss": 
	    	updateMarketData();
	    	updateMorale(cMorale + theEvent.MoraleBoost);
	    	var tickerObjs = {"BTC": { "Name": "Bitcoin", "Price": 10135.27,"PosDeviation": 4,"NegDeviation": 3}};
	    	updateMarketData(tickerObjs);
	    	break;
	  	case "SatoshiReturns":
	  		updateMarketData();
	    	var tickerObjs = {"BTC": { "Name": "Bitcoin", "Price": 10135.27,"PosDeviation": 0.2,"NegDeviation": 0.01}}; //crash BTC price, by calling updateMarketData with tickerObject with appropriate PosDeviation and NegDeviation
	    	updateMarketData(tickerObjs);
	    	break;
	    case "Inflation":
	    	updateMarketData();
	    	updateMorale(cMorale + theEvent.MoraleBoost);
	    	updateCash(cCash - parseFloat(cCash/4));
	    	break;
	    case "JustinSun":
	    	updateMarketData();
	    	var tickerObjs = {"TRX": { "Name": "Tron", "Price": 0.025208,"PosDeviation": 0.4,"NegDeviation": 0.1}};
	    	updateMarketData(tickerObjs);
	    	break;
	    case "XRPPrinting":
	    	updateMarketData();
	    	var tickerObjs = {"XRP": { "Name": "XRP", "Price": 0.316034,"PosDeviation": 0.2,"NegDeviation": 0.08}};
	    	updateMarketData(tickerObjs);
	    	break;
	    case "ETHPrinting":
	    	updateMarketData();
	    	var tickerObjs = {"ETH": { "Name": "Ethereum", "Price": 214.14,"PosDeviation": 0.2,"NegDeviation": 0.08}};
	    	updateMarketData(tickerObjs);
	    	break;
	    case "Tether":
	    	updateMarketData();
	    	var tickerObjs = {"USDT": { "Name": "Tether", "Price": 1.00,"PosDeviation": 0.6,"NegDeviation": 0.4}};
	    	updateMarketData(tickerObjs);
	    	break;
	    case "Asteroid":
	    case "USDPrinting":
		    //pump BTC price
		    updateMarketData();
		    var tickerObjs = {"BTC": { "Name": "Bitcoin", "Price": 10135.27,"PosDeviation": 8,"NegDeviation": 4}};
		    updateMarketData(tickerObjs);
		    break;
		case "CNBC":
			updateMarketData();
			updateMorale(cMorale + theEvent.MoraleBoost);
			loseHoldings(1.333); //lose 25% holdings
			break;
		case "Wifescam":
			updateMarketData();
			loseHoldings(2);//lose 50% holdings
			break;
		case "ETHGiveaway":
	    	updateMarketData();
	    	updateMorale(cMorale + theEvent.MoraleBoost);
	    	loseHoldings(-1,"ETH",5);
	    	break;
		case "Exitscam":
			updateMarketData();
			loseHoldings(2);
		    //all prices crash
		    var tickerObjs = $.extend( true, {}, oMarketData ); //clone original data instead of reference the same variable because javascript is retarded
		    Object.keys(tickerObjs).forEach(function(key) {	
		    	if (key!="USDT") { 
		    		tickerObjs[key].PosDeviation = 0.3; tickerObjs[key].NegDeviation = 0.05; 
		    	} else { 
		    		tickerObjs[key].PosDeviation = 0.999; tickerObjs[key].PosDeviation = 0.988;
		    	}
		    }); //replace variations
		    updateMarketData(tickerObjs);
		    break;
		case "ChineseNewYear":
		case "Consensus":
			//updateMarketData(); //trade sideways by not updating marketdata
			$("#marketsParentData .greenArrow").attr("style","none");
			$("#marketsParentData .redArrow").attr("style","none");
			updateMorale(cMorale + theEvent.MoraleBoost);
			break;
		case "BrainWallet":
			//lose all holdings
			updateMarketData();
			currentHoldings = [];
			$("#holdingParentData").empty();
			updateHoldingsValueDisplay();
			updateMorale(cMorale + theEvent.MoraleBoost);
			break;
		default:
			updateMarketData(); 	
		    break;
	}
}
function dispFixedStatus(mTxt, eTxt, tImg, flash){
	if (flash) {
		$("#statusTxtSpan").html(mTxt).trigger('change');
	} else {
		$("#statusTxtSpan").html(mTxt);
	}
	$(".effectTxtDiv").html(eTxt);
	$("#statusImg").attr("src",tImg);
}
function getCurrentHoldingMaxQuantity(){
	var currentHoldingsUnits = 0;
	for (i = 0; i < currentHoldings.length; i++){ 
		if (parseInt(currentHoldings[i].quantity) > parseInt(currentHoldingsUnits)) {
			currentHoldingsUnits = parseInt(currentHoldings[i].quantity);	
		}
	}
	return parseInt(currentHoldingsUnits);
}
function updateMarketData(tickerObjsOverride){
	//if tickerObjsOverride is provided, we're overriding the market data manually...
	var marketDataObjs = oMarketData;
	if (typeof tickerObjsOverride != "undefined") marketDataObjs = tickerObjsOverride;
	//first, do random market fluctuations based on deviation data in data.json (). oMarketData is Original data, cMarketData is current.  Deviations calculated from original to prevent results getting too crazy in 31 days.
	Object.keys(marketDataObjs).forEach(function(key) {
		var ranMultiplier = parseFloat((Math.random() * (marketDataObjs[key].PosDeviation - marketDataObjs[key].NegDeviation) + marketDataObjs[key].NegDeviation).toFixed(4))
		var newPrice = marketDataObjs[key].Price * ranMultiplier;
		$("#"+key+"greenArrow").attr("style","");
		$("#"+key+"redArrow").attr("style","");

		if (cMarketData[key].Price > newPrice) {
			$("#"+key+"redArrow").attr("style","display: inline-block !important"); //have to apply with attr because jquery doesn't handle !important well!
		} else {
			$("#"+key+"greenArrow").attr("style","display: inline-block !important");
		}
		//update cMarketData and html elements
		cMarketData[key].Price = newPrice;
		$("#"+key+"PriceSpan").html(formatDollar(newPrice,""));
	});
	//the market data has updated so update any change in holdings value
	updateHoldingsValueDisplay();
}
function currentAssetHoldings(asset){
	if (typeof currentHoldings.find(x => x.ticker === asset) == "undefined") {
		return 0;
	} else {
		return parseInt(currentHoldings[0].quantity);
	}
}
function clickedHoldingAsset(id){
	if (gOver) return;
	//sell!
	var tickerClicked = id.replace('HoldingRow','');
	var quantityOwned = parseFloat(currentHoldings.find(x => x.ticker === tickerClicked).quantity);
	$("#sellAssetMainMessage").html("You have " + formatDollar(quantityOwned,"") + " " + tickerClicked + " to sell");
	var totalSalePrice = parseFloat(quantityOwned) * parseFloat(cMarketData[tickerClicked].Price);

	$("#sellingUnitsSpan").html(formatDollar(quantityOwned,""));
	$("#sellingAssetSpan").html(tickerClicked);
	$("#sellingCostSpan").html(formatDollar(totalSalePrice,"$"));
	$("#sellAssetSlider").attr("min",1);
	$("#sellAssetSlider").attr("max",quantityOwned);
	$("#sellAssetSlider").val(quantityOwned);
	$("#sellAssetButton").css("display","inline-block");
	$("#sellAssetSlider").css("display","block");
	$("#confirmSellAssetMessage").css("display","block");
	$("#sellAssetModal").modal();
}
function soldAsset(quantity, asset){
	//credit for asset
	var totalSale = quantity * cMarketData[asset].Price;
	updateCash(parseFloat(cCash + totalSale));
	var soldAllAsset = false;
	//update holdings
	if (quantity < currentHoldings.find(x => x.ticker === asset).quantity) {
		//we still have some of the asset left, so just update existing values in holdingsDiv and currentHoldings
		var newHolding = currentHoldings.find(x => x.ticker === asset).quantity - quantity;
		currentHoldings.find(x => x.ticker === asset).quantity = newHolding;
		$("#holdingParentData #" + asset + "HoldingQuantity").html(newHolding);
	} else {
		//we sold all the asset so remove the div and element from currentHoldings
		var indexToRemove = currentHoldings.findIndex(x => x.ticker === asset);
		currentHoldings.splice(indexToRemove, 1);
		soldAllAsset = true; //just needed to know whether to do a Bogdanoff Pump
		$("#holdingParentData #" + asset + "HoldingRow").remove();
	}
	//trigger random selling events on 40% of sales
	if (Math.random() < 0.4) {
		var sellingEvents = $.extend( true, {}, gEvents.selling ); //clone original data
		Object.keys(sellingEvents).forEach(function(key2) {
			if (sellingEvents[key2].Appearances < sellingEvents[key2].MaxAppearances) {
				if (((soldAllAsset && parseFloat(cMarketData['BTC'].Price) < 20000 ) || key2!="BogdanoffPump") && (sellingEvents[key2].EffectAssets == "All" || $.inArray(asset, sellingEvents[key2].EffectAssets) > -1)) {
					//the asset we're selling is valid for this event type (e.g. selling BTC, Bodanoff valid) and Bogdanoff pump check
					sellingEvents[key2].key1 = "selling";
					sellingEvents[key2].key2 = key2;
				} else {
					delete sellingEvents[key2];
				}
			} else {
				delete sellingEvents[key2];
			}
		});
		if (Object.keys(sellingEvents).length > 0) {
			var randomSaleProperty = randPropFromObj(sellingEvents);
			if (randomSaleProperty.key2=="BadAddress") reduceSaleProfit(2); //divide by 2 = keep half
			if (randomSaleProperty.key2=="BadTransactionFee") reduceSaleProfit(4); //divide by 1.33 = keep 75%
			if (randomSaleProperty.key2=="Mempool") cancelSale(); //cancel sale
			function reduceSaleProfit(sFactor){
				var portionTotalSale = Math.round(totalSale / sFactor);
				updateCash(parseFloat(cCash - portionTotalSale));
			}		
			function cancelSale(){
				updateCash(parseFloat(cCash - totalSale)); //reverse cash gain
				boughtAsset(quantity, asset, true); //"gift" the asset/quantity back
			}		
			triggerEvent(randomSaleProperty);
		}
	}
	updateHoldingsValueDisplay();
	//playSound("audCashReg");
	$("#sellAssetModal").modal('hide');
}
function clickedAsset(id){
	if (gOver) return;
	var tickerClicked = id.replace('MarketRow','');
	if (cCash < cMarketData[tickerClicked].Price) {
		$("#buyAssetMainMessage").html("You can't even afford 1 " + tickerClicked + "!");
		$("#buyAssetSlider").css("display","none");
		$("#confirmBuyAssetMessage").css("display","none");
		$("#buyAssetButton").css("display","none");
	} else {
		var affordableUnits = Math.floor(cCash / cMarketData[tickerClicked].Price);
		$("#buyAssetMainMessage").html("You can afford " + formatDollar(affordableUnits,"") + " " + tickerClicked);
		var totalCost = affordableUnits * cMarketData[tickerClicked].Price;
		$("#buyingUnitsSpan").html(formatDollar(affordableUnits,""));
		$("#buyingAssetSpan").html(tickerClicked);
		$("#buyingCostSpan").html(formatDollar(totalCost,"$"));
		$("#buyAssetSlider").attr("min",1);
		$("#buyAssetSlider").attr("max",affordableUnits);
		$("#buyAssetSlider").val(affordableUnits);
		$("#buyAssetButton").css("display","inline-block");
		$("#buyAssetSlider").css("display","block");
		$("#confirmBuyAssetMessage").css("display","block");
	}	
	$("#buyAssetModal").modal();//({keyboard: false});
}
function boughtAsset(quantity, asset, gift){
	if ($("#buyAssetSlider").css("display")=="none" && !gift) {
		$("#buyAssetModal").modal('hide');
		return;
	}
	if (!gift) {
		var totalCost = quantity * cMarketData[asset].Price;
		updateCash(parseFloat(cCash - totalCost));
	}
	if (typeof currentHoldings.find(x => x.ticker === asset) == "undefined") {
		//store in currentHoldings array which contains holdings objects (better than referring to HTML elements with dollar formatting)
		var newHoldingObj = {};
		newHoldingObj.ticker = asset;
		newHoldingObj.quantity = quantity;
		newHoldingObj.price = cMarketData[asset].Price;
		newHoldingObj.cumulativeWeightedPrice = parseFloat(newHoldingObj.price * newHoldingObj.quantity);
		currentHoldings.push(newHoldingObj);
		var newHoldingDiv = '<div id="'+asset+'HoldingRow" class="row marketRow" onclick="clickedHoldingAsset(this.id)"><div class="col-sm-3 col3F">'+asset+'</div><div id="'+asset+'HoldingQuantity" class="col-sm-4 col4F">'+quantity+'</div><div class="col-sm-5 col5F" id="'+asset+'HoldingPrice"><span id="'+asset+'HoldingPriceSpan">'+formatDollar(cMarketData[asset].Price,"")+'</span><span class="sellSpan">Sell</span></div>';
		$("#holdingParentData").append(newHoldingDiv);
	} else {
		//we already have a holding for this asset so update quantity and 
		currentHoldings.find(x => x.ticker === asset).quantity = parseInt(currentHoldings.find(x => x.ticker === asset).quantity) + parseInt(quantity);
		currentHoldings.find(x => x.ticker === asset).price = parseFloat(cMarketData[asset].Price); //last price
		currentHoldings.find(x => x.ticker === asset).cumulativeWeightedPrice = currentHoldings.find(x => x.ticker === asset).cumulativeWeightedPrice + parseFloat(currentHoldings.find(x => x.ticker === asset).price * parseInt(quantity));
		var avgPrice = parseFloat(currentHoldings.find(x => x.ticker === asset).cumulativeWeightedPrice / currentHoldings.find(x => x.ticker === asset).quantity);
		$("#"+asset+"HoldingQuantity").html(formatDollar(parseFloat(currentHoldings.find(x => x.ticker === asset).quantity),"")); //set quantity
		$("#"+asset+"HoldingRow #"+asset+"HoldingPriceSpan").html(formatDollar(avgPrice,"")); //set avg weighted price
	}
	updateHoldingsValueDisplay();
	//playSound("audCashReg");
	if (!gift) $("#buyAssetModal").modal('hide');
}
function loseHoldings(divideHoldings, ticker, amount){
	if (divideHoldings<0) {
		//we're removing specific holdings of ticker/amount - validation was already done when generating the event to know the user has the assets to lose WITHOUT LOSING ALL OF THE TICKER AMOUNT
		currentHoldings.find(x => x.ticker === ticker).quantity = parseInt(currentHoldings.find(x => x.ticker === ticker).quantity) - parseInt(amount);
		$("#"+ticker+"HoldingQuantity").html(formatDollar(parseFloat(currentHoldings.find(x => x.ticker === ticker).quantity),""));
	} else {
		//lose perc% holdings
		for (i = 0; i < currentHoldings.length; i++){ 
			currentHoldings[i].quantity = Math.round(currentHoldings[i].quantity / divideHoldings); 
			$("#"+currentHoldings[i].ticker+"HoldingQuantity").html(formatDollar(parseFloat(currentHoldings.find(x => x.ticker === currentHoldings[i].ticker).quantity),""));
		}
	}
	updateHoldingsValueDisplay();
}
function updateHoldingsValueDisplay(){
	var totalHoldings = 0;
	for (i = 0; i < currentHoldings.length; i++){
		totalHoldings = totalHoldings + parseFloat(cMarketData[currentHoldings[i].ticker].Price * currentHoldings[i].quantity);
	}
	updateHoldingValue(formatDollar(totalHoldings,"$")); 
}
/*function playSound(theSound){
	//document.getElementById('soundChkInp').muted = "false";
	if (document.getElementById('soundChkInp').checked){

		//$("#"+theSound).attr("muted","false"); //unmute the sound (- t will be remuted as part of it's called to onended()
		//$("#music").on("ended", yourFunction);
		var sound = document.getElementById(theSound);

		if (!sound.paused) {
	        sound.pause();
	        sound.currentTime = 0
	    }     
	    sound.play();   

	}
}*/
function loadInitialData(){
	var cacheB = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
	$.getJSON("data/data.json?v="+cacheB, function(json) {
		//load players starting cash, morale, and game length
		updateCash(parseFloat(json.cashStart));
		updateMorale(json.moraleStart);
		cHoldingsValue = parseFloat(json.holdingsStart);
		updateHoldingValue(formatDollar(cHoldingsValue,"$"));

		gEvents = json.events;

		$("#dayTotalSpan").html(json.dayLimit);
		dayLim = parseInt(json.dayLimit);

		standardImg = json.initialImg;
		standardTxt = json.initialInstructions;
		standardEffectTxt = json.initialEffectTxt;
		dispFixedStatus(standardTxt,standardEffectTxt,standardImg, false);
		lastImg = json.finalImg;
		lastTxt = json.finalInstructions;
		lastEffectTxt = json.finalEffectTxt;
		
		$("#holdingParentData").empty(); //empty holdings that may be left over from previous game

		//load player locations/graphics and location-specific settings
		$("#locationsParent").empty();
		Object.keys(json.locations).forEach(function(key) {
			var locNoSpaces = key.replace(/\s/g, '') + "Button";
			var disableTxt = ""
			if (json.locations[key].enabled==false) disableTxt = " disabled ";
			var newLocation = '<button class="locationButton" id="'+locNoSpaces+ '" '+disableTxt+' onclick="changeLocation(this.id)">'+key+'</button>';
			$("#locationsParent").append(newLocation);
		});

		//load market data
		$("#marketsParentData").empty();
		Object.keys(json.cryptoMarkets).forEach(function(key) {
			cMarketData = json.cryptoMarkets;
			oMarketData = $.extend( true, {}, cMarketData ); //need to make deep object copy instead of oMarketData = cMarketData;
		    var newCrypto = '<div class="row marketRow" id="'+key+'MarketRow" onclick="clickedAsset(this.id)"><div class="col-sm-2 col2F">'+key+'</div><div class="col-sm-5 col5F">'+json.cryptoMarkets[key].Name+'</div><div class="col-sm-5 col5F" id="'+key+'Price"><i class="fa fa-arrow-up greenArrow" id="'+key+'greenArrow"></i><i class="fa fa-arrow-down redArrow" id="'+key+'redArrow"></i><span id="'+key+'PriceSpan">'+formatDollar(json.cryptoMarkets[key].Price,"")+'</span><span class="buySpan">Buy</span></div>';
		    $("#marketsParentData").append(newCrypto);
		});
		if (firstLoad){
			//load all images now so we don't have to wait when clicking locations
			for (var key in gEvents) {
			  for (var key2 in gEvents[key]) {
			    for (var key3 in gEvents[key][key2]){
					if (key3=="img") $("#loadImgs").append( "<img style='height:1px;width:1px' src='"+ gEvents[key][key2][key3] +"'>" );
			  	}
			  }
			}
		}
		firstLoad = false;
	});
}
var firstLoad = true;
$(function() {
	loadInitialData();
});
function updateBuySlider(slider){
	var totalCost = slider.value * cMarketData[$('#buyingAssetSpan').html()].Price;
	$('#buyingUnitsSpan').html(formatDollar(parseFloat(slider.value),''));
	$("#buyingCostSpan").html(formatDollar(totalCost,"$"));
}
function updateSellSlider(slider){
	var totalSale = slider.value * cMarketData[$('#sellingAssetSpan').html()].Price;
	$('#sellingUnitsSpan').html(formatDollar(parseFloat(slider.value),''));
	$("#sellingCostSpan").html(formatDollar(totalSale,"$"));
}
function resetGame(){
	cDay = 1;
	$("#dayCountSpan").html(cDay);
	dayLim = 31;
	cCash = 0;
	gOver = false;
	cMorale = 0;
	currentHoldings = [];
	loadInitialData();
}
$(document).on("keypress", function(e){
    if (e.which == 13){
    	//pressed enter so check whether a buy/sell modal is open
    	if ($("#sellAssetModal").hasClass("show")) {
    		if ($("#sellAssetButton").css("display")=="none") {
    			$("#cancelSellButton").click();
    		} else {
    			$("#sellAssetButton").click();
    		}
    	}
    	if ($("#buyAssetModal").hasClass("show")) {
    		if ($("#buyAssetButton").css("display")=="none") {
    			$("#cancelBuyButton").click();
    		} else {
    			$("#buyAssetButton").click();
    		}
    	}
    	if ($("#gameOverModal").hasClass("show")) $("#gameAgainPlayAgainButton").click();
    }
});
function gameOver(type){
	if (type=="rekt"){
		//morale hit zero
		$("#gameOverImg").attr("src","images/gameOver-rekt.png");
		$("#gameOverMainMessage").html("REKT");
		$("#gameOverSubMessage").html("Perhaps you're not cut out for crypto?");
	}
	if (type=="finish"){
		//made it to end of day 31 
		var totalHoldings = 0;
		for (i = 0; i < currentHoldings.length; i++){ totalHoldings = totalHoldings + parseFloat(cMarketData[currentHoldings[i].ticker].Price * currentHoldings[i].quantity);}
		var totalAssets = parseFloat(totalHoldings) + parseFloat(cCash);
		$("#gameOverImg").attr("src","images/gameOver-finish.png");
		$("#gameOverMainMessage").html("Made It!");
		$("#gameOverSubMessage").html("You have total assets worth <span style='color:#13c113;font-size:14px;'>" + formatDollar(totalAssets,"$") + "</span> after 1 month in Crypto!");
	}
	$("#locationsParent button").each(function(i) {
	   $(this).prop("disabled",true);
	});
	gOver = true;
	$("#gameOverModal").modal();
}