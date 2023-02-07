import {LightningNode} from '../proto/lnd/lnrpc/lightning';

// TODO - Improve result quality and speed.
// One option for quality would be to use total node channel capacity as a ranking for results.
// One option for speed would be to use a trie rather than iterating over a list of nodes.
export class LightningNodeSearcher {
  private nodesByPubkey: {[pubkey: string]: LightningNode} = {};

  /**
   * Inserts a LightningNode instance, replacing any previous instance *if* the new
   * instance has a later `lastUpdate` timestamp - otherwise this function will no-op.
   * @param node
   */
  upsertNode(node: LightningNode) {
    const previousNode = this.nodesByPubkey[node.pubKey];
    if (!previousNode || previousNode.lastUpdate < node.lastUpdate) {
      this.nodesByPubkey[node.pubKey] = node;
    }
  }

  search(text: string, caseSensitive = false, maxResults = 10): LightningNode[] {
    if (!caseSensitive) {
      text = text.toLowerCase();
    }

    const results = [];

    for (const pubkey in this.nodesByPubkey) {
      const node = this.nodesByPubkey[pubkey];

      if (caseSensitive) {
        if (node.pubKey.includes(text) || node.alias.includes(text)) {
          results.push(node);
        }
      } else {
        if (node.pubKey.toLowerCase().includes(text) || node.alias.toLowerCase().includes(text)) {
          results.push(node);

        }
      }

      if (results.length >= maxResults) {
        break;
      }
    }

    return results;
  }
}