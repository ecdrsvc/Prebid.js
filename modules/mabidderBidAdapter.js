import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { deepAccess } from '../src/utils.js';

const BIDDER_CODE = 'mabidder';
export const baseUrl = 'https://prebid.ecdrsvc.com/bid';
const converter = ortbConverter({})

export const spec = {
  supportedMediaTypes: [BANNER, VIDEO],
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    if (typeof bid.params === 'undefined') {
      return false;
    }
    return !!(bid.params.ppid && ((getSizes(bid).length > 0)))
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const fpd = converter.toORTB({ bidRequests: validBidRequests, bidderRequest: bidderRequest });

    const bids = [];
    validBidRequests.forEach(bidRequest => {
      const bid = {
        bidId: bidRequest.bidId,
        ppid: bidRequest.params.ppid,
        sizes: getSizes(bidRequest)
      };
      if (bidRequest.mediaType == BANNER || isBanner(bidRequest)) {
        bid.mediaType = BANNER;
      } else if (bidRequest.mediaType == VIDEO || isVideo(bidRequest)) {
        bid.mediaType = VIDEO;
        bid.video = deepAccess(bidRequest, 'mediaTypes.video');
      }
      bids.push(bid)
    });

    const req = {
      url: baseUrl,
      method: 'POST',
      data: {
        v: getGlobal().version,
        bids: bids,
        url: bidderRequest.refererInfo.page || '',
        referer: bidderRequest.refererInfo.ref || '',
        fpd: fpd || {}
      }
    };

    return req;
  },
  interpretResponse: function(serverResponse, request) {
    const bidResponses = [];
    if (serverResponse.body) {
      const body = serverResponse.body;
      if (!body || typeof body !== 'object' || !body.Responses || !(body.Responses.length > 0)) {
        return [];
      }
      body.Responses.forEach((bidResponse) => {
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
  }
}
registerBidder(spec);

function isVideo(bid) {
  return !!deepAccess(bid, 'mediaTypes.video');
}

function isBanner(bid) {
  return !!deepAccess(bid, 'mediaTypes.banner');
}

function getSizes(bidRequest) {
  let sizes = [];
  if (bidRequest.mediaType == BANNER || isBanner(bidRequest)) {
    const banner = deepAccess(bidRequest, 'mediaTypes.banner');
    banner.sizes.forEach(size => {
      sizes.push({
        width: size[0],
        height: size[1]
      });
    });
  } else if (bidRequest.mediaType == VIDEO || isVideo(bidRequest)) {
    const video = deepAccess(bidRequest, 'mediaTypes.video')
    sizes.push({
      width: video.playerSize[0],
      height: video.playerSize[1]
    });
  } else if (bidRequest.sizes && Array.isArray(bidRequest.sizes) && Array.isArray(bidRequest.sizes[0])) {
    bidRequest.sizes.forEach(size => {
      sizes.push({
        width: size[0],
        height: size[1]
      });
    });
  }
  return sizes;
}
