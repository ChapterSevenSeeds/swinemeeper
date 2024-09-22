import resources from "./resources.json";
import { CloudFrontClient, CreateInvalidationCommand, GetInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { spawnSmart } from "./spawnSmart";

(async () => {
    console.log("Building frontend...");
    await spawnSmart("pnpm run build");
    console.log("Done building frontend...");

    console.log("Uploading files...");
    await spawnSmart(`aws s3 sync build s3://${resources.S3BucketName} --delete`);
    console.log("Done uploading files...");

    console.log("Waiting for invalidation...");
    const cloudfrontClient = new CloudFrontClient({ region: "us-east-1" });
    const result = await cloudfrontClient.send(new CreateInvalidationCommand({ DistributionId: resources.CloudFrontDistributionId, InvalidationBatch: { CallerReference: Date.now().toString(), Paths: { Quantity: 1, Items: ["/*"] } } }));
    while (result.Invalidation && result.Invalidation.Status !== "Completed") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        result.Invalidation = (await cloudfrontClient.send(new GetInvalidationCommand({ DistributionId: resources.CloudFrontDistributionId, Id: result.Invalidation?.Id }))).Invalidation;
    }
})();