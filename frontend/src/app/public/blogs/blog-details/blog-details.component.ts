import { DOCUMENT } from '@angular/common';
import { Component, OnInit, Renderer2 , Inject} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { storage } from 'src/app/apis/config';
import { GeneralService } from 'src/app/apis/general.service';

@Component({
  selector: 'app-blog-details',
  templateUrl: './blog-details.component.html',
  styleUrls: ['./blog-details.component.css']
})
export class BlogDetailsComponent implements OnInit {


  constructor(private general : GeneralService , private route : ActivatedRoute ,

    private _render2:Renderer2,
    @Inject(DOCUMENT) private _document : Document,
     private router : Router , private metaService : Meta , private title : Title){
    this.router.routeReuseStrategy.shouldReuseRoute = function () {
      return false;
    };
  }

  storage =storage
  article : any
  articles : any = []
  slug = this.reverseSlug(this.route.snapshot.params['slug'])
  reverseSlug(input: string): string {
    return input.replace(/-/g, ' ');
  }
  ngOnInit(): void {
    this.general.article(this.slug)
    .subscribe((data : any)=>{
      this.article = data
      this.setup()
    })

    this.general.lastArticles().subscribe((d: any) => {
      this.articles = d;
    });
  }

  setup(){
    this.title.setTitle(this.article.designation_fr);
    this.metaService.updateTag( { name : 'image' , content : storage+this.article.cover});
    this.metaService.updateTag( { name : 'og:image' , content : storage+this.article.cover});
    this.metaService.updateTag( { name : 'og:title' , content : this.article.designation_fr});
    if(this.article.meta && this.article.meta != ''){
      let tags = this.article.meta.split('|');
      if(tags && tags.length >0){

        tags.map((tag : any)=>{
          let meta_data = tag.split(';');
          if(meta_data&& meta_data.length >1){
            this.metaService.updateTag( { name:meta_data[0].trim(),content:meta_data[1]});


            if(meta_data[0].trim() == 'title'){
              this.title.setTitle(meta_data[1]);
            }
          }
        })

      }
    }else{
      this.metaService.updateTag( { name : 'title' , content : this.article.designation_fr});
      this.metaService.updateTag( { name : 'description' , content : this.article.description_fr});

    }

    let script = this._render2.createElement('script');
    script.type = `application/ld+json`
    if(this.article.review){
      script.text=`{
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": "${this.article.designation_fr}",
        "description": "${this.article.content_seo}",
        "image": "${storage}${this.article.cover}",
        "review": ${this.article.review},
        "aggregateRating": ${this.article.aggregateRating}
      }`
    }else{
      script.text=`{
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": "${this.article.designation_fr}",
        "description": "${this.article.content_seo}",
        "image": "${storage}${this.article.cover}"

      }`
    }
    this._render2.appendChild(this._document.body , script)

  }
}
