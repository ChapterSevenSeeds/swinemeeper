import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { writeFile } from "fs/promises";

(async () => {
    const client = new CloudFormationClient({ region: "us-east-1" });
    const command = new DescribeStacksCommand({ StackName: `minesweeper-stack` });
    const response = await client.send(command);

    const outputMap = response.Stacks?.[0].Outputs?.reduce((acc, output) => {
        if (!output?.OutputKey || !output?.OutputValue) return acc;

        acc[output.OutputKey] = output.OutputValue;
        return acc;
    }, {} as Record<string, string>);

    await writeFile("resources.json", JSON.stringify(outputMap, null, 2));
})();