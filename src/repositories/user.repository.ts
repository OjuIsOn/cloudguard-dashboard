import { User } from "@/models/user";
import { BaseRepository } from "./base.repository";

export class UserRepository extends BaseRepository<any> {
  constructor() {
    super(User);
  }

  // Add any custom methods specific to the User collection here
  async findByEmail(email: string) {
    return await this.model.findOne({ email }).exec();
  }
}

// Export a singleton instance for easy use
export const userRepository = new UserRepository();
