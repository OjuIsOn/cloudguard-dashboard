import { ResourceGroup } from "@/models/resourceGroup";
import { BaseRepository } from "./base.repository";

export class ResourceGroupRepository extends BaseRepository<any> {
  constructor() {
    super(ResourceGroup);
  }

  async findByUserId(userId: string) {
    return await this.model.find({ userId }).exec();
  }
}

export const resourceGroupRepository = new ResourceGroupRepository();
