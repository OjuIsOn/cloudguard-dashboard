import { App } from "@/models/app";
import { BaseRepository } from "./base.repository";

export class AppRepository extends BaseRepository<any> {
  constructor() {
    super(App);
  }

  async findByUserId(userId: string) {
    return await this.model.find({ userId }).exec();
  }
}

export const appRepository = new AppRepository();
