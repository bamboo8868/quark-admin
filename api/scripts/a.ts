interface A {
	name:number;
	age:string;
}


function aaa(a:A) {
	console.log(a.name,a.age);
}


aaa({name:1111,age:'xxxx'})