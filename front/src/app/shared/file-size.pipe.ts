import { Pipe, PipeTransform } from '@angular/core';

const UNITS = ['o', 'Ko', 'Mo', 'Go'];
const NUMBER_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

// Binary units (1 Ko = 1024 o), like the 1 GB limit of the API
@Pipe({ name: 'fileSize' })
export class FileSizePipe implements PipeTransform {
  transform(bytes: number): string {
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < UNITS.length - 1) {
      size /= 1024;
      unit++;
    }
    return `${NUMBER_FORMAT.format(size)} ${UNITS[unit]}`;
  }
}
