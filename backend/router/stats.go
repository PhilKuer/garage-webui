package router

import (
	"encoding/json"
	"fmt"
	"khairul169/garage-webui/utils"
	"net/http"
)

type Stats struct{}

func (s *Stats) GetClusterStats(w http.ResponseWriter, r *http.Request) {
	body, err := utils.Garage.Fetch("/v2/GetClusterStatistics", &utils.FetchOptions{})
	if err != nil {
		utils.ResponseError(w, err)
		return
	}

	var result interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		utils.ResponseError(w, err)
		return
	}

	utils.ResponseSuccess(w, result)
}

type ClusterStatusNode struct {
	ID              string      `json:"id"`
	Addr            string      `json:"addr"`
	Hostname        string      `json:"hostname"`
	IsUp            bool        `json:"isUp"`
	LastSeenSecsAgo interface{} `json:"lastSeenSecsAgo"`
	Draining        bool        `json:"draining"`
	DataPartition   *struct {
		Available int64 `json:"available"`
		Total     int64 `json:"total"`
	} `json:"dataPartition"`
	MetadataPartition *struct {
		Available int64 `json:"available"`
		Total     int64 `json:"total"`
	} `json:"metadataPartition"`
}

type ClusterStatusResponse struct {
	Node           string            `json:"node"`
	GarageVersion  string            `json:"garageVersion"`
	KnownNodes     []ClusterStatusNode `json:"knownNodes"`
	Nodes          []ClusterStatusNode `json:"nodes"`
	Layout         *LayoutResponse   `json:"layout"`
	LayoutVersion  int               `json:"layoutVersion"`
}

type LayoutResponse struct {
	Version int          `json:"version"`
	Roles   []LayoutRole `json:"roles"`
}

type LayoutRole struct {
	ID       string   `json:"id"`
	Zone     string   `json:"zone"`
	Capacity int64    `json:"capacity"`
	Tags     []string `json:"tags"`
}

type NodeStatsResult struct {
	ID                string      `json:"id"`
	Addr              string      `json:"addr"`
	Hostname          string      `json:"hostname"`
	IsUp              bool        `json:"isUp"`
	LastSeenSecsAgo   interface{} `json:"lastSeenSecsAgo"`
	Draining          bool        `json:"draining"`
	Role              *LayoutRole `json:"role"`
	DataPartition     interface{} `json:"dataPartition"`
	MetadataPartition interface{} `json:"metadataPartition"`
	Stats             interface{} `json:"stats"`
}

func (s *Stats) GetNodeStats(w http.ResponseWriter, r *http.Request) {
	body, err := utils.Garage.Fetch("/v2/GetClusterStatus", &utils.FetchOptions{})
	if err != nil {
		utils.ResponseError(w, err)
		return
	}

	var status ClusterStatusResponse
	if err := json.Unmarshal(body, &status); err != nil {
		utils.ResponseError(w, err)
		return
	}

	nodes := status.KnownNodes
	if len(nodes) == 0 {
		nodes = status.Nodes
	}

	// Filter to storage nodes only (those with a role in the layout)
	var storageNodes []ClusterStatusNode
	roleMap := map[string]*LayoutRole{}

	if status.Layout != nil {
		for i := range status.Layout.Roles {
			role := &status.Layout.Roles[i]
			roleMap[role.ID] = role
		}
	}

	for _, node := range nodes {
		if _, ok := roleMap[node.ID]; ok {
			storageNodes = append(storageNodes, node)
		}
	}

	ch := make(chan NodeStatsResult, len(storageNodes))

	for _, node := range storageNodes {
		go func() {
			result := NodeStatsResult{
				ID:                node.ID,
				Addr:              node.Addr,
				Hostname:          node.Hostname,
				IsUp:              node.IsUp,
				LastSeenSecsAgo:   node.LastSeenSecsAgo,
				Draining:          node.Draining,
				Role:              roleMap[node.ID],
				DataPartition:     node.DataPartition,
				MetadataPartition: node.MetadataPartition,
			}

			statsBody, err := utils.Garage.Fetch("/v2/GetNodeStatistics", &utils.FetchOptions{
				Params: map[string]string{"node": node.ID},
			})
			if err == nil {
				var stats interface{}
				if err := json.Unmarshal(statsBody, &stats); err == nil {
					result.Stats = stats
				}
			}

			ch <- result
		}()
	}

	res := make([]NodeStatsResult, 0, len(storageNodes))
	for i := 0; i < len(storageNodes); i++ {
		res = append(res, <-ch)
	}

	utils.ResponseSuccess(w, res)
}
