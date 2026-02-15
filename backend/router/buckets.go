package router

import (
	"encoding/json"
	"fmt"
	"khairul169/garage-webui/schema"
	"khairul169/garage-webui/utils"
	"log"
	"net/http"
)

type Buckets struct{}

func (b *Buckets) GetAll(w http.ResponseWriter, r *http.Request) {
	body, err := utils.Garage.Fetch("/v2/ListBuckets", &utils.FetchOptions{})
	if err != nil {
		utils.ResponseError(w, err)
		return
	}

	var buckets []schema.GetBucketsRes
	if err := json.Unmarshal(body, &buckets); err != nil {
		utils.ResponseError(w, err)
		return
	}

	ch := make(chan schema.Bucket, len(buckets))

	for _, bucket := range buckets {
		go func() {
			body, err := utils.Garage.Fetch(fmt.Sprintf("/v2/GetBucketInfo?id=%s", bucket.ID), &utils.FetchOptions{})

			if err != nil {
				ch <- schema.Bucket{ID: bucket.ID, GlobalAliases: bucket.GlobalAliases}
				return
			}

			var data schema.Bucket
			if err := json.Unmarshal(body, &data); err != nil {
				ch <- schema.Bucket{ID: bucket.ID, GlobalAliases: bucket.GlobalAliases}
				return
			}

			data.LocalAliases = bucket.LocalAliases
			ch <- data
		}()
	}

	res := make([]schema.Bucket, 0, len(buckets))
	for i := 0; i < len(buckets); i++ {
		res = append(res, <-ch)
	}

	utils.ResponseSuccess(w, res)
}

func (b *Buckets) ForceDelete(w http.ResponseWriter, r *http.Request) {
	bucketID := r.URL.Query().Get("id")
	if bucketID == "" {
		utils.ResponseErrorStatus(w, fmt.Errorf("bucket id is required"), http.StatusBadRequest)
		return
	}

	// Get bucket info to find the alias for S3 operations
	body, err := utils.Garage.Fetch(fmt.Sprintf("/v2/GetBucketInfo?id=%s", bucketID), &utils.FetchOptions{})
	if err != nil {
		utils.ResponseError(w, fmt.Errorf("cannot get bucket info: %w", err))
		return
	}

	var bucket schema.Bucket
	if err := json.Unmarshal(body, &bucket); err != nil {
		utils.ResponseError(w, err)
		return
	}

	var bucketName string
	if len(bucket.GlobalAliases) > 0 {
		bucketName = bucket.GlobalAliases[0]
	} else if len(bucket.LocalAliases) > 0 {
		bucketName = bucket.LocalAliases[0].Alias
	} else {
		utils.ResponseErrorStatus(w, fmt.Errorf("bucket has no alias, cannot access via S3"), http.StatusBadRequest)
		return
	}

	// Empty the bucket first
	if bucket.Objects > 0 {
		client, err := getS3Client(bucketName)
		if err != nil {
			utils.ResponseError(w, fmt.Errorf("cannot get S3 client: %w", err))
			return
		}

		deleted, err := deleteAllObjects(client, bucketName, "")
		if err != nil {
			utils.ResponseError(w, fmt.Errorf("failed to empty bucket after deleting %d objects: %w", deleted, err))
			return
		}
		log.Printf("Emptied bucket %s: deleted %d objects", bucketName, deleted)
	}

	// Remove all aliases before deleting
	for _, alias := range bucket.GlobalAliases {
		_, err := utils.Garage.Fetch("/v2/RemoveBucketAlias", &utils.FetchOptions{
			Method: http.MethodPost,
			Body:   map[string]string{"bucketId": bucketID, "globalAlias": alias},
		})
		if err != nil {
			utils.ResponseError(w, fmt.Errorf("cannot remove alias %s: %w", alias, err))
			return
		}
	}

	for _, la := range bucket.LocalAliases {
		_, err := utils.Garage.Fetch("/v2/RemoveBucketAlias", &utils.FetchOptions{
			Method: http.MethodPost,
			Body:   map[string]string{"bucketId": bucketID, "accessKeyId": la.AccessKeyID, "localAlias": la.Alias},
		})
		if err != nil {
			utils.ResponseError(w, fmt.Errorf("cannot remove local alias %s: %w", la.Alias, err))
			return
		}
	}

	// Delete the bucket via Garage admin API
	_, err = utils.Garage.Fetch(fmt.Sprintf("/v2/DeleteBucket?id=%s", bucketID), &utils.FetchOptions{
		Method: http.MethodPost,
	})
	if err != nil {
		utils.ResponseError(w, fmt.Errorf("cannot delete bucket: %w", err))
		return
	}

	utils.ResponseSuccess(w, map[string]bool{"deleted": true})
}
