import { AppDataSource } from "../config/database";
import { Address } from "../models/address.model";
import { ApiError } from "../utils/ApiError";

export class AddressService {
  private addressRepository = AppDataSource.getRepository(Address);

  async listAddresses(userId: string): Promise<Address[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: "DESC", createdAt: "DESC" },
    });
  }

  async getAddress(userId: string, id: string): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id, userId },
    });
    if (!address) {
      throw new ApiError(404, "Address not found");
    }
    return address;
  }

  async createAddress(
    userId: string,
    data: Partial<Address>,
  ): Promise<Address> {
    if (data.isDefault) {
      await this.addressRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    const existingCount = await this.addressRepository.count({
      where: { userId },
    });

    const address = this.addressRepository.create({
      ...data,
      userId,
      isDefault: data.isDefault ?? existingCount === 0,
    });

    return this.addressRepository.save(address);
  }

  async updateAddress(
    userId: string,
    id: string,
    data: Partial<Address>,
  ): Promise<Address> {
    const address = await this.getAddress(userId, id);

    if (data.isDefault) {
      await this.addressRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(address, data);
    return this.addressRepository.save(address);
  }

  async deleteAddress(userId: string, id: string): Promise<void> {
    const address = await this.getAddress(userId, id);
    await this.addressRepository.remove(address);
  }
}

export default new AddressService();
